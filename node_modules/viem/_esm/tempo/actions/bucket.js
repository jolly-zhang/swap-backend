import * as Gateway from '../Gateway.js';
/**
 * Deletes an object from the app's bucket. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * await Actions.bucket.delete(gateway, { key: 'notes/today.txt' })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns Whether the request succeeded.
 */
// biome-ignore lint/correctness/noUnusedVariables: exported as delete
async function delete_(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/bucket/delete',
        signal,
    });
    return (await response.json());
}
export { delete_ as delete };
/**
 * Reads an object from the app's bucket as a stream. Returns `null` when the
 * object does not exist or expired. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const object = await Actions.bucket.get(gateway, { key: 'notes/today.txt' })
 * const text = object ? await new Response(object.body).text() : null
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The object body and metadata, or `null`.
 */
export async function get(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/bucket/get',
        signal,
    }).catch((error) => {
        if (error instanceof Gateway.RequestError && error.code === 'not_found')
            return null;
        throw error;
    });
    if (!response?.body)
        return null;
    const { headers } = response;
    return {
        body: response.body,
        contentType: headers.get('content-type'),
        etag: headers.get('etag'),
        expiresAt: Number(headers.get('gateway-expires-at')),
        key,
    };
}
/**
 * Reads the metadata of an object in the app's bucket. Returns `null` when the
 * object does not exist or expired. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const metadata = await Actions.bucket.head(gateway, { key: 'notes/today.txt' })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The object metadata, or `null`.
 */
export async function head(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/bucket/head',
        signal,
    });
    return (await response.json());
}
/**
 * Lists objects in the app's bucket by key prefix. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { cursor, objects } = await Actions.bucket.list(gateway, {
 *   prefix: 'notes/',
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns A page of object metadata and the next cursor.
 */
export async function list(gateway, parameters = {}) {
    const { cursor, limit, prefix, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ cursor, limit, prefix }),
        path: '/bucket/list',
        signal,
    });
    return (await response.json());
}
/**
 * Writes an object to the app's bucket for a retention period. Paid per
 * request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const metadata = await Actions.bucket.put(gateway, {
 *   key: 'notes/today.txt',
 *   retention: 86_400,
 *   value: new Blob(['hello'], { type: 'text/plain' }),
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The object metadata.
 */
export async function put(gateway, parameters) {
    const { key, retention, signal, value } = parameters;
    const body = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    const size = isBlob(body) ? body.size : body.byteLength;
    const contentType = parameters.contentType ??
        (typeof value === 'string' ? 'text/plain;charset=utf-8' : undefined) ??
        (isBlob(value) && value.type ? value.type : undefined) ??
        'application/octet-stream';
    const response = await Gateway.request(gateway, {
        body: body,
        headers: {
            'content-type': contentType,
            'gateway-key': key,
            'gateway-retention': String(retention),
            'gateway-size': String(size),
        },
        path: '/bucket/put',
        signal,
    });
    return (await response.json());
}
/** Detects a `Blob` without `instanceof`, so ones from another realm count. */
function isBlob(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.arrayBuffer === 'function' &&
        typeof value.size === 'number');
}
//# sourceMappingURL=bucket.js.map