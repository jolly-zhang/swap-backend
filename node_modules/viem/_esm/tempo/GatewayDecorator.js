import { readContract } from '../actions/public/readContract.js';
import { erc20Abi } from '../constants/abis.js';
import * as aiActions from './actions/ai.js';
import * as bucketActions from './actions/bucket.js';
import * as computeActions from './actions/compute.js';
import * as gatewayActions from './actions/gateway.js';
import * as kvActions from './actions/kv.js';
import * as Gateway from './Gateway.js';
/**
 * Adds Gateway inference (`client.ai`), object storage (`client.bucket`),
 * sandboxed compute (`client.compute`), and key-value state (`client.kv`) to a
 * Client.
 *
 * When the Client has a local account, requests are paid with it through
 * `mppx` (an optional peer dependency, loaded on the first request). Other
 * Clients use `globalThis.fetch`, which the Accounts SDK makes payment-aware
 * for Tempo Wallet. Pass `fetch` to pay another way. Data is scoped by chain, the paying wallet, and `app`.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, gatewayActions } from 'viem/tempo'
 *
 * const client = createClient({ account }).extend(gatewayActions())
 *
 * const { text } = await client.ai.generateText({
 *   model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
 *   prompt: 'Describe this app in one sentence.',
 * })
 * await client.kv.set({ key: 'description', value: text })
 * ```
 *
 * @param options - Gateway connection options.
 * @returns A Client decorator.
 */
export function decorator(options = {}) {
    return (client) => {
        const gateway = Gateway.from({
            ...options,
            fetch: options.fetch ??
                (client.account?.type === 'local' ? pay(client) : undefined),
        });
        return {
            ai: {
                embed: (parameters) => aiActions.embed(gateway, parameters),
                generateText: (parameters) => aiActions.generateText(gateway, parameters),
                streamText: (parameters) => aiActions.streamText(gateway, parameters),
            },
            bucket: {
                delete: (parameters) => bucketActions.delete(gateway, parameters),
                get: (parameters) => bucketActions.get(gateway, parameters),
                head: (parameters) => bucketActions.head(gateway, parameters),
                list: (parameters) => bucketActions.list(gateway, parameters),
                put: (parameters) => bucketActions.put(gateway, parameters),
            },
            compute: {
                create: (parameters) => computeActions.create(gateway, parameters),
                exec: (parameters) => computeActions.exec(gateway, parameters),
                list: (parameters) => computeActions.list(gateway, parameters),
                logs: (parameters) => computeActions.logs(gateway, parameters),
                read: (parameters) => computeActions.read(gateway, parameters),
                renew: (parameters) => computeActions.renew(gateway, parameters),
                snapshot: (parameters) => computeActions.snapshot(gateway, parameters),
                spawn: (parameters) => computeActions.spawn(gateway, parameters),
                status: (parameters) => computeActions.status(gateway, parameters),
                stream: (parameters) => computeActions.stream(gateway, parameters),
                terminate: (parameters) => computeActions.terminate(gateway, parameters),
                write: (parameters) => computeActions.write(gateway, parameters),
            },
            gateway: {
                getCapabilities: (parameters) => gatewayActions.getCapabilities(gateway, parameters),
            },
            kv: {
                delete: (parameters) => kvActions.delete(gateway, parameters),
                get: (parameters) => kvActions.get(gateway, parameters),
                list: (parameters) => kvActions.list(gateway, parameters),
                set: (parameters) => kvActions.set(gateway, parameters),
            },
        };
    };
}
/**
 * Pays Gateway requests with the Client's account through `mppx`. Requests go
 * through `globalThis.fetch` until the Gateway first asks for payment, so free
 * routes work without `mppx` installed. `mppx` is loaded then, paying in the
 * Gateway currency the account holds most of. When the account runs out, the
 * next request reads its balances again, so funding it is enough to continue.
 */
function pay(client) {
    let mppx;
    let funds;
    return async (input, init) => {
        if (!mppx) {
            const response = await globalThis.fetch(input, init);
            if (response.status !== 402)
                return response;
            await response.body?.cancel().catch(() => { });
            funds = await balances(client, new URL(input).origin);
            const [best] = funds.balances;
            if (!best || best.amount === 0n)
                throw new Gateway.InsufficientFundsError(funds);
            mppx = load().then(({ Mppx, tempo }) => Mppx.create({
                methods: [
                    tempo({
                        account: client.account,
                        getClient: ({ chainId }) => {
                            const expected = client.chain?.id;
                            if (chainId !== undefined &&
                                expected !== undefined &&
                                chainId !== expected)
                                throw new Gateway.ChainMismatchError({ chainId, expected });
                            return client;
                        },
                    }),
                ],
                orderChallenges: (candidates) => [...candidates].sort((a, b) => Number(!isCurrency(a, best.currency)) -
                    Number(!isCurrency(b, best.currency))),
                polyfill: false,
            }).fetch, (error) => {
                mppx = undefined;
                throw new Gateway.MppxNotInstalledError({ cause: error });
            });
        }
        const underfunded = async (error) => {
            if (!(error instanceof Error) || !isUnderfunded(error))
                return error;
            mppx = undefined;
            const current = await balances(client, new URL(input).origin).catch(() => funds);
            return new Gateway.InsufficientFundsError({
                ...(current ?? { address: '0x', balances: [] }),
                cause: error,
            });
        };
        const response = await (await mppx)(input, init).catch(async (error) => {
            throw await underfunded(error);
        });
        if (!response.body)
            return response;
        const reader = response.body.getReader();
        const body = new ReadableStream({
            cancel: (reason) => reader.cancel(reason),
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done)
                        controller.close();
                    else
                        controller.enqueue(value);
                }
                catch (error) {
                    controller.error(await underfunded(error));
                }
            },
        });
        const wrapped = new Response(body, {
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
        });
        Object.defineProperty(wrapped, 'url', { value: response.url });
        return wrapped;
    };
}
/** Reads the account's balance of each Gateway currency, largest first. */
async function balances(client, origin) {
    const address = client.account.address;
    const response = await globalThis.fetch(`${origin}/v1/capabilities`);
    const { chainId, currencies } = (await response.json());
    const expected = client.chain?.id;
    if (expected !== undefined && chainId !== expected)
        throw new Gateway.ChainMismatchError({ chainId, expected });
    const balances = await Promise.all(Object.entries(currencies).map(async ([symbol, currency]) => ({
        amount: (await readContract(client, {
            abi: erc20Abi,
            address: currency,
            args: [address],
            functionName: 'balanceOf',
        })),
        currency,
        symbol: symbol.toUpperCase(),
    })));
    return {
        address,
        balances: balances.sort((a, b) => (b.amount > a.amount ? 1 : -1)),
    };
}
function isCurrency(candidate, currency) {
    const requested = candidate.challenge?.request?.currency;
    return requested?.toLowerCase() === currency.toLowerCase();
}
/** Whether a payment failed because the account could not cover it. */
function isUnderfunded(error) {
    for (let cause = error; cause instanceof Error; cause = cause.cause)
        if (/InsufficientBalance/.test(cause.message))
            return true;
    return false;
}
/**
 * Loads `mppx/client`. The specifier is cast so TypeScript doesn't pull the
 * optional peer dependency's types into Viem's, while bundlers still see a
 * literal import.
 */
function load() {
    return import('mppx/client');
}
//# sourceMappingURL=GatewayDecorator.js.map