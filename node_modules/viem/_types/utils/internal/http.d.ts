/**
 * Returns a signal that aborts as soon as any of `signals` aborts, and a
 * `cleanup` function that detaches the listeners added to `signals`.
 */
export declare function anySignal(signals: readonly (AbortSignal | null | undefined)[]): {
    signal: AbortSignal;
    cleanup: () => void;
};
/**
 * Reads a response body as text, throwing once it exceeds
 * `maxResponseBodySize` bytes (`false` reads it whole).
 */
export declare function readResponseBody(response: Response, { maxResponseBodySize }: {
    maxResponseBodySize: number | false;
}): Promise<string>;
//# sourceMappingURL=http.d.ts.map