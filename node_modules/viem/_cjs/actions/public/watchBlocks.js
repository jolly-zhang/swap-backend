"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchBlocks = watchBlocks;
const getAction_js_1 = require("../../utils/getAction.js");
const observe_js_1 = require("../../utils/observe.js");
const poll_js_1 = require("../../utils/poll.js");
const stringify_js_1 = require("../../utils/stringify.js");
const getBlock_js_1 = require("./getBlock.js");
function watchBlocks(client, { blockTag = client.experimental_blockTag ?? 'latest', emitMissed: emitMissed_, emitOnBegin = false, onBlock, onError, includeTransactions: includeTransactions_, poll: poll_, pollingInterval = client.pollingInterval, }) {
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
    const blockTime = client.chain?.blockTime;
    const emitMissed = emitMissed_ ??
        ((blockTag === 'latest' || blockTag === 'pending') &&
            blockTime !== undefined &&
            pollingInterval > blockTime / 2);
    const maxMissed = emitMissed_ === undefined ? 100 : Number.POSITIVE_INFINITY;
    let prevBlock;
    const pollBlocks = () => {
        const observerId = (0, stringify_js_1.stringify)([
            'watchBlocks',
            client.uid,
            blockTag,
            emitMissed,
            emitOnBegin,
            includeTransactions,
            maxMissed,
            pollingInterval,
        ]);
        return (0, observe_js_1.observe)(observerId, { onBlock, onError }, (emit) => (0, poll_js_1.poll)(async () => {
            try {
                const block = await (0, getAction_js_1.getAction)(client, getBlock_js_1.getBlock, 'getBlock')({
                    blockTag,
                    includeTransactions,
                });
                if (block.number !== null && prevBlock?.number != null) {
                    if (block.number === prevBlock.number)
                        return;
                    const missed = Number(block.number - prevBlock.number) - 1;
                    if (missed > 0 && missed <= maxMissed && emitMissed) {
                        const batchSize = 10;
                        const start = prevBlock.number + 1n;
                        for (let i = 0; i < missed; i += batchSize) {
                            const blocks = await Promise.all(Array.from({ length: Math.min(batchSize, missed - i) }, (_, j) => (0, getAction_js_1.getAction)(client, getBlock_js_1.getBlock, 'getBlock')({
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
                if (prevBlock?.number == null ||
                    (blockTag === 'pending' && block?.number == null) ||
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
                    (0, getAction_js_1.getAction)(client, getBlock_js_1.getBlock, 'getBlock')({
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
                        const block = (await (0, getAction_js_1.getAction)(client, getBlock_js_1.getBlock, 'getBlock')({
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