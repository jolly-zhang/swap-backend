import { getAction } from '../../utils/getAction.js';
import { observe } from '../../utils/observe.js';
import { poll } from '../../utils/poll.js';
import { stringify } from '../../utils/stringify.js';
import { getBlock } from './getBlock.js';
/**
 * Watches and returns information for incoming blocks.
 *
 * - Docs: https://viem.sh/docs/actions/public/watchBlocks
 * - Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/blocks_watching-blocks
 * - JSON-RPC Methods:
 *   - When `poll: true`, calls [`eth_getBlockByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getBlockByNumber) on a polling interval.
 *   - When `poll: false` & WebSocket Transport, uses a WebSocket subscription via [`eth_subscribe`](https://docs.alchemy.com/reference/eth-subscribe-polygon) and the `"newHeads"` event.
 *
 * @param client - Client to use
 * @param parameters - {@link WatchBlocksParameters}
 * @returns A function that can be invoked to stop watching for new block numbers. {@link WatchBlocksReturnType}
 *
 * @example
 * import { createPublicClient, watchBlocks, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 *
 * const client = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const unwatch = watchBlocks(client, {
 *   onBlock: (block) => console.log(block),
 * })
 */
export function watchBlocks(client, { blockTag = client.experimental_blockTag ?? 'latest', emitMissed: emitMissed_, emitOnBegin = false, onBlock, onError, includeTransactions: includeTransactions_, poll: poll_, pollingInterval = client.pollingInterval, }) {
    const enablePolling = (() => {
        if (typeof poll_ !== 'undefined')
            return poll_;
        if (client.transport.type === 'webSocket' ||
            client.transport.type === 'ipc')
            return false;
        if (client.transport.type === 'fallback' &&
            (client.transport.transports[0].config.type === 'webSocket' ||
                client.transport.transports[0].config.type === 'ipc'))
            return false;
        return true;
    })();
    const includeTransactions = includeTransactions_ ?? false;
    // Polling less than twice per block skips blocks, so emit the missed
    // ones unless told otherwise. `safe` and `finalized` can move by
    // thousands of blocks at once (such as on Arbitrum) at any polling
    // interval, so they emit missed blocks only when asked.
    const blockTime = client.chain?.blockTime;
    const emitMissed = emitMissed_ ??
        ((blockTag === 'latest' || blockTag === 'pending') &&
            blockTime !== undefined &&
            pollingInterval > blockTime / 2);
    // The default catches up at most 100 blocks, so a long gap, such as a
    // device waking from sleep, skips to the latest block.
    const maxMissed = emitMissed_ === undefined ? 100 : Number.POSITIVE_INFINITY;
    let prevBlock;
    const pollBlocks = () => {
        const observerId = stringify([
            'watchBlocks',
            client.uid,
            blockTag,
            emitMissed,
            emitOnBegin,
            includeTransactions,
            maxMissed,
            pollingInterval,
        ]);
        return observe(observerId, { onBlock, onError }, (emit) => poll(async () => {
            try {
                const block = await getAction(client, getBlock, 'getBlock')({
                    blockTag,
                    includeTransactions,
                });
                if (block.number !== null && prevBlock?.number != null) {
                    // If the current block number is the same as the previous,
                    // we can skip.
                    if (block.number === prevBlock.number)
                        return;
                    // If we have missed out on some previous blocks, and the
                    // `emitMissed` flag is truthy, let's emit those blocks.
                    // Fetch them in parallel batches so catching up takes a few
                    // round trips rather than one per block.
                    const missed = Number(block.number - prevBlock.number) - 1;
                    if (missed > 0 && missed <= maxMissed && emitMissed) {
                        const batchSize = 10;
                        const start = prevBlock.number + 1n;
                        for (let i = 0; i < missed; i += batchSize) {
                            const blocks = await Promise.all(Array.from({ length: Math.min(batchSize, missed - i) }, (_, j) => getAction(client, getBlock, 'getBlock')({
                                blockNumber: start + BigInt(i + j),
                                includeTransactions,
                            })));
                            for (const block of blocks) {
                                emit.onBlock(block, prevBlock);
                                prevBlock = block;
                            }
                        }
                    }
                }
                if (
                // If no previous block exists, emit.
                prevBlock?.number == null ||
                    // If the block tag is "pending" with no block number, emit.
                    (blockTag === 'pending' && block?.number == null) ||
                    // If the next block number is greater than the previous block number, emit.
                    // We don't want to emit blocks in the past.
                    (block.number !== null && block.number > prevBlock.number)) {
                    emit.onBlock(block, prevBlock);
                    prevBlock = block;
                }
            }
            catch (err) {
                emit.onError?.(err);
            }
        }, {
            emitOnBegin,
            interval: pollingInterval,
        }));
    };
    const subscribeBlocks = () => {
        let active = true;
        let emitFetched = true;
        let unsubscribe = () => (active = false);
        (async () => {
            try {
                if (emitOnBegin) {
                    getAction(client, getBlock, 'getBlock')({
                        blockTag,
                        includeTransactions,
                    })
                        .then((block) => {
                        if (!active)
                            return;
                        if (!emitFetched)
                            return;
                        onBlock(block, undefined);
                        emitFetched = false;
                    })
                        .catch(onError);
                }
                const transport = (() => {
                    if (client.transport.type === 'fallback') {
                        const transport = client.transport.transports.find((transport) => transport.config.type === 'webSocket' ||
                            transport.config.type === 'ipc');
                        if (!transport)
                            return client.transport;
                        return transport.value;
                    }
                    return client.transport;
                })();
                const { unsubscribe: unsubscribe_ } = await transport.subscribe({
                    params: ['newHeads'],
                    async onData(data) {
                        if (!active)
                            return;
                        const block = (await getAction(client, getBlock, 'getBlock')({
                            blockNumber: data.result?.number,
                            includeTransactions,
                        }).catch(() => { }));
                        if (!active)
                            return;
                        onBlock(block, prevBlock);
                        emitFetched = false;
                        prevBlock = block;
                    },
                    onError(error) {
                        onError?.(error);
                    },
                });
                unsubscribe = unsubscribe_;
                if (!active)
                    unsubscribe();
            }
            catch (err) {
                onError?.(err);
            }
        })();
        return () => unsubscribe();
    };
    return enablePolling ? pollBlocks() : subscribeBlocks();
}
//# sourceMappingURL=watchBlocks.js.map