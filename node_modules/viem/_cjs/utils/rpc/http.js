"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpRpcClient = getHttpRpcClient;
exports.parseUrl = parseUrl;
const request_js_1 = require("../../errors/request.js");
const utils_js_1 = require("../../errors/utils.js");
const http_js_1 = require("../internal/http.js");
const withTimeout_js_1 = require("../promise/withTimeout.js");
const stringify_js_1 = require("../stringify.js");
const id_js_1 = require("./id.js");
const defaultMaxResponseBodySize = 10_485_760;
const timedOut = new Error('timed out');
function getHttpRpcClient(url_, options = {}) {
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
                const { response, responseBody } = await (0, withTimeout_js_1.withTimeout)(async ({ signal: timeoutSignal }) => {
                    const { signal, cleanup } = (0, http_js_1.anySignal)([
                        signal_,
                        timeout > 0 ? timeoutSignal : null,
                    ]);
                    try {
                        const init = {
                            ...fetchOptions,
                            body: Array.isArray(body)
                                ? (0, stringify_js_1.stringify)(body.map((body) => ({
                                    jsonrpc: '2.0',
                                    id: body.id ?? id_js_1.idCache.take(),
                                    ...body,
                                })))
                                : (0, stringify_js_1.stringify)({
                                    jsonrpc: '2.0',
                                    id: body.id ?? id_js_1.idCache.take(),
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
                        const args = (onRequest &&
                            (await onRequest(new Request(url, init), init))) ?? {
                            ...init,
                            url,
                        };
                        const response = await fetchFn(args.url ?? url, args);
                        if (onResponse)
                            await onResponse(response);
                        const responseBody = await (0, http_js_1.readResponseBody)(response, {
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
                const error = Array.isArray(body) && Array.isArray(data) && data.length === 1
                    ? data[0]
                    : data;
                if (!response.ok) {
                    if (isRpcError(error))
                        throw new request_js_1.RpcRequestError({
                            body,
                            error: error.error,
                            headers: response.headers,
                            status: response.status,
                            url,
                        });
                    throw new request_js_1.HttpRequestError({
                        body,
                        details: (0, stringify_js_1.stringify)(data.error) || response.statusText,
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
                    throw (0, utils_js_1.getAbortError)(signal_);
                if (err === timedOut)
                    throw new request_js_1.TimeoutError({ body, url });
                if ((0, utils_js_1.isAbortError)(err))
                    throw err;
                if (err instanceof request_js_1.HttpRequestError)
                    throw err;
                if (err instanceof request_js_1.ResponseBodyTooLargeError)
                    throw err;
                if (err instanceof request_js_1.RpcRequestError)
                    throw err;
                if (err instanceof request_js_1.TimeoutError)
                    throw err;
                throw new request_js_1.HttpRequestError({
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
function parseUrl(url_) {
    try {
        const url = new URL(url_);
        const result = (() => {
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