/**
 * Reads a Gateway NDJSON stream, one event per line. An `error` event throws a
 * {@link Gateway.RequestError}. Stopping early cancels the response body, so
 * the Gateway stops the upstream work.
 */
export declare function read<event extends {
    type: string;
}>(response: Response): AsyncGenerator<event>;
//# sourceMappingURL=ndjson.d.ts.map