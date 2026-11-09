import * as Gateway from '../Gateway.js';
/**
 * Deletes a key from the app's key-value store. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { deleted } = await Actions.kv.delete(gateway, { key: 'counter' })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns Whether the key existed.
 */
// biome-ignore lint/correctness/noUnusedVariables: exported as delete
async function delete_(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/kv/delete',
        signal,
    });
    return (await response.json());
}
export { delete_ as delete };
/**
 * Reads a key from the app's key-value store. Returns `null` when the key does
 * not exist or expired. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const entry = await Actions.kv.get(gateway, { key: 'counter' })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The entry, or `null`.
 */
export async function get(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/kv/get',
        signal,
    });
    return (await response.json());
}
/**
 * Lists entries in the app's key-value store by key prefix, in key order. Paid
 * per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { cursor, entries } = await Actions.kv.list(gateway, {
 *   prefix: 'settings/',
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns A page of entries and the next cursor.
 */
export async function list(gateway, parameters = {}) {
    const { cursor, limit, prefix, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ cursor, limit, prefix }),
        path: '/kv/list',
        signal,
    });
    return (await response.json());
}
/**
 * Writes a JSON value to the app's key-value store. Paid per request.
 *
 * Pass `ifVersion` to write conditionally: `null` creates the key only if it
 * does not exist, and a version replaces the value only if it is still that
 * version. A failed condition throws `Gateway.VersionConflictError`.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const entry = await Actions.kv.set(gateway, {
 *   ifVersion: null,
 *   key: 'counter',
 *   value: { count: 1 },
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The written entry.
 */
export async function set(gateway, parameters) {
    const { ifVersion, key, signal, ttl, value } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ ifVersion, key, ttl, value }),
        path: '/kv/set',
        signal,
    });
    return (await response.json());
}
//# sourceMappingURL=kv.js.map