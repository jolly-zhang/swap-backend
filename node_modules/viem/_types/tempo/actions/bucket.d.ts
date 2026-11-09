import * as Gateway from '../Gateway.js';
/**
 * Metadata of an object in a Gateway bucket.
 *
 * @experimental
 */
export type Metadata = {
    /** Content type. */
    contentType: string | null;
    /** Entity tag. */
    etag: string;
    /** Expiry as a Unix timestamp in milliseconds. */
    expiresAt: number;
    /** Object key. */
    key: string;
    /** Size in bytes. */
    size: number;
    /** Upload time as a Unix timestamp in milliseconds. */
    uploadedAt: number;
};
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
declare function delete_(gateway: Gateway.Gateway, parameters: delete_.Parameters): Promise<delete_.ReturnValue>;
declare namespace delete_ {
    type Parameters = {
        /** Object key. */
        key: string;
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
    };
    type ReturnValue = {
        /** Whether the request succeeded. */
        deleted: boolean;
    };
    type ErrorType = Gateway.request.ErrorType;
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
export declare function get(gateway: Gateway.Gateway, parameters: get.Parameters): Promise<get.ReturnValue>;
export declare namespace get {
    type Parameters = {
        /** Object key. */
        key: string;
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
    };
    type ReturnValue = {
        /** Object bytes. */
        body: ReadableStream<Uint8Array>;
        /** Content type. */
        contentType: string | null;
        /** Entity tag. */
        etag: string | null;
        /** Expiry as a Unix timestamp in milliseconds. */
        expiresAt: number;
        /** Object key. */
        key: string;
    } | null;
    type ErrorType = Gateway.request.ErrorType;
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
export declare function head(gateway: Gateway.Gateway, parameters: head.Parameters): Promise<head.ReturnValue>;
export declare namespace head {
    type Parameters = {
        /** Object key. */
        key: string;
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
    };
    type ReturnValue = Metadata | null;
    type ErrorType = Gateway.request.ErrorType;
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
export declare function list(gateway: Gateway.Gateway, parameters?: list.Parameters): Promise<list.ReturnValue>;
export declare namespace list {
    type Parameters = {
        /** Cursor from a previous page. */
        cursor?: string | undefined;
        /** Maximum objects per page. */
        limit?: number | undefined;
        /** Key prefix. */
        prefix?: string | undefined;
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
    };
    type ReturnValue = {
        /** Cursor of the next page, or `null` on the last page. */
        cursor: string | null;
        /** Objects on this page. */
        objects: readonly Metadata[];
    };
    type ErrorType = Gateway.request.ErrorType;
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
export declare function put(gateway: Gateway.Gateway, parameters: put.Parameters): Promise<put.ReturnValue>;
export declare namespace put {
    type Parameters = {
        /**
         * Content type.
         *
         * @default The Blob's type, `text/plain;charset=utf-8` for strings, or `application/octet-stream`.
         */
        contentType?: string | undefined;
        /** Object key. */
        key: string;
        /** Retention in seconds. The object expires afterwards. */
        retention: number;
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
        /** Object bytes. */
        value: Blob | Uint8Array | ArrayBuffer | string;
    };
    type ReturnValue = Metadata;
    type ErrorType = Gateway.request.ErrorType;
}
//# sourceMappingURL=bucket.d.ts.map