import { HttpRequestError, ResponseBodyTooLargeError, RpcRequestError, TimeoutError, } from '../../errors/request.js';
import { getAbortError, isAbortError, } from '../../errors/utils.js';
import { anySignal, readResponseBody } from '../internal/http.js';
import { withTimeout, } from '../promise/withTimeout.js';
import { stringify } from '../stringify.js';
import { idCache } from './id.js';
const defaultMaxResponseBodySize = 10_485_760;
/**
 * Rejection of a request that timed out. Replaced by a `TimeoutError`, which
 * serializes the request body, only once a request actually times out.
 */
const timedOut = /*#__PURE__*/ new Error('timed out');
export function getHttpRpcClient(url_, options = {}) {
    const { url, headers: headers_url } = parseUrl(url_);
    return {
        async request(params) {
            const { body, fetchFn = options.fetchFn ?? fetch, maxResponseBodySize = options.maxResponseBodySize ??
                defaultMaxResponseBodySize, onRequest = options.onRequest, onResponse = options.onResponse, timeout = options.timeout ?? 10_000, } = params;
            const fetchOptions = {
                ...(options.fetchOptions ?? {}),
                ...(params.fetchOptions ?? {}),
            };
            const { headers, method, signal: signal_ } = fetchOptions;
            try {
                const { response, responseBody } = await withTimeout(async ({ signal: timeoutSignal }) => {
                    // Abort on whichever fires first so that a `signal` does not
                    // disable the timeout.
                    const { signal, cleanup } = anySignal([
                        signal_,
                        timeout > 0 ? timeoutSignal : null,
                    ]);
                    try {
                        const init = {
                            ...fetchOptions,
                            body: Array.isArray(body)
                                ? stringify(body.map((body) => ({
                                    jsonrpc: '2.0',
                                    id: body.id ?? idCache.take(),
                                    ...body,
                                })))
                                : stringify({
                                    jsonrpc: '2.0',
                                    id: body.id ?? idCache.take(),
                                    ...body,
                                }),
                            headers: {
                                ...headers_url,
                                'Content-Type': 'application/json',
                                ...headers,
                            },
                            method: method || 'POST',
                            signal,
                        };
                        // Only the hook needs a `Request`, which is costly to construct.
                        const args = (onRequest &&
                            (await onRequest(new Request(url, init), init))) ?? {
                            ...init,
                            url,
                        };
                        const response = await fetchFn(args.url ?? url, args);
                        if (onResponse)
                            await onResponse(response);
                        // Read the body within the timeout too, so a response that stalls
                        // after its headers cannot hang the request.
                        const responseBody = await readResponseBody(response, {
                            maxResponseBodySize,
                        });
                        return { response, responseBody };
                    }
                    finally {
                        cleanup();
                    }
                }, {
                    errorInstance: timedOut,
                    timeout,
                    signal: true,
                });
                let data;
                if (response.headers.get('Content-Type')?.startsWith('application/json'))
                    data = JSON.parse(responseBody);
                else {
                    data = responseBody;
                    try {
                        data = JSON.parse(data || '{}');
                    }
                    catch (err) {
                        if (response.ok)
                            throw err;
                        data = { error: data };
                    }
                }
                // A server that rejects a whole batch replies with a single error, bare
                // or in a one-element array (geth).
                const error = Array.isArray(body) && Array.isArray(data) && data.length === 1
                    ? data[0]
                    : data;
                if (!response.ok) {
                    // A valid JSON-RPC error body keeps its RPC error class and the
                    // response status and headers for retries.
                    if (isRpcError(error))
                        throw new RpcRequestError({
                            body,
                            error: error.error,
                            headers: response.headers,
                            status: response.status,
                            url,
                        });
                    throw new HttpRequestError({
                        body,
                        details: stringify(data.error) || response.statusText,
                        headers: response.headers,
                        status: response.status,
                        url,
                    });
                }
                if (!Array.isArray(body) || !body.length)
                    return data;
                if (Array.isArray(data) && data.length >= body.length)
                    return data;
                if (!isRpcError(error))
                    throw new Error(`Expected ${body.length} responses to batch request.`);
                return body.map(() => error);
            }
            catch (err) {
                if (signal_?.aborted)
                    throw getAbortError(signal_);
                if (err === timedOut)
                    throw new TimeoutError({ body, url });
                if (isAbortError(err))
                    throw err;
                if (err instanceof HttpRequestError)
                    throw err;
                if (err instanceof ResponseBodyTooLargeError)
                    throw err;
                if (err instanceof RpcRequestError)
                    throw err;
                if (err instanceof TimeoutError)
                    throw err;
                throw new HttpRequestError({
                    body,
                    cause: err,
                    url,
                });
            }
        },
    };
}
function isRpcError(data) {
    return (typeof data?.error?.code === 'number' &&
        typeof data?.error?.message === 'string');
}
/** @internal */
export function parseUrl(url_) {
    try {
        const url = new URL(url_);
        const result = (() => {
            // Handle Basic authentication credentials
            if (url.username) {
                const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
                url.username = '';
                url.password = '';
                return {
                    url: url.toString(),
                    headers: { Authorization: `Basic ${btoa(credentials)}` },
                };
            }
            return;
        })();
        return { url: url.toString(), ...result };
    }
    catch {
        return { url: url_ };
    }
}
//# sourceMappingURL=http.js.map