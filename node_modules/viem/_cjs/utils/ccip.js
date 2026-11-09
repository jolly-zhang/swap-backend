"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offchainLookupAbiItem = exports.offchainLookupSignature = void 0;
exports.offchainLookup = offchainLookup;
exports.ccipRequest = ccipRequest;
const call_js_1 = require("../actions/public/call.js");
const ccip_js_1 = require("../errors/ccip.js");
const request_js_1 = require("../errors/request.js");
const utils_js_1 = require("../errors/utils.js");
const decodeErrorResult_js_1 = require("./abi/decodeErrorResult.js");
const encodeAbiParameters_js_1 = require("./abi/encodeAbiParameters.js");
const isAddressEqual_js_1 = require("./address/isAddressEqual.js");
const concat_js_1 = require("./data/concat.js");
const isHex_js_1 = require("./data/isHex.js");
const localBatchGatewayRequest_js_1 = require("./ens/localBatchGatewayRequest.js");
const http_js_1 = require("./internal/http.js");
const withTimeout_js_1 = require("./promise/withTimeout.js");
const stringify_js_1 = require("./stringify.js");
const ccipTimeout = 10_000;
const maxCcipResponseBytes = 10_485_760;
exports.offchainLookupSignature = '0x556f1830';
exports.offchainLookupAbiItem = {
    name: 'OffchainLookup',
    type: 'error',
    inputs: [
        {
            name: 'sender',
            type: 'address',
        },
        {
            name: 'urls',
            type: 'string[]',
        },
        {
            name: 'callData',
            type: 'bytes',
        },
        {
            name: 'callbackFunction',
            type: 'bytes4',
        },
        {
            name: 'extraData',
            type: 'bytes',
        },
    ],
};
async function offchainLookup(client, { blockNumber, blockTag, budget = (0, localBatchGatewayRequest_js_1.createCcipReadBudget)(), data, depth = 0, requestOptions, to, }) {
    const { args } = (0, decodeErrorResult_js_1.decodeErrorResult)({
        data,
        abi: [exports.offchainLookupAbiItem],
    });
    const [sender, urls, callData, callbackSelector, extraData] = args;
    const { ccipRead } = client;
    const ccipRequest_ = ccipRead && typeof ccipRead?.request === 'function'
        ? ccipRead.request
        : ccipRequest;
    const timeout = getTransportTimeout(client.transport);
    try {
        if (depth >= localBatchGatewayRequest_js_1.ccipReadLimit.depth)
            throw new request_js_1.HttpRequestError({
                details: `CCIP Read exceeded the maximum callback depth (${localBatchGatewayRequest_js_1.ccipReadLimit.depth}).`,
                url: urls[0] ?? '',
            });
        if (!(0, isAddressEqual_js_1.isAddressEqual)(to, sender))
            throw new ccip_js_1.OffchainLookupSenderMismatchError({ sender, to });
        const result = await (async () => {
            if (urls.includes(localBatchGatewayRequest_js_1.localBatchGatewayUrl))
                return (0, localBatchGatewayRequest_js_1.localBatchGatewayRequest)({
                    budget,
                    ccipRequest: (parameters) => ccipRequest_({
                        ...parameters,
                        requestOptions,
                        timeout: parameters.timeout ?? timeout,
                    }),
                    data: callData,
                });
            if (budget.queries <= 0)
                throw new request_js_1.HttpRequestError({
                    details: `CCIP Read exceeded the maximum number of queries (${localBatchGatewayRequest_js_1.ccipReadLimit.queries}).`,
                    url: urls[0] ?? '',
                });
            const urls_ = urls.slice(0, budget.queries);
            budget.queries -= Math.max(1, urls_.length);
            return budget.run(() => ccipRequest_({
                data: callData,
                requestOptions,
                sender,
                timeout,
                urls: urls_,
            }));
        })();
        const callbackData = (0, concat_js_1.concat)([
            callbackSelector,
            (0, encodeAbiParameters_js_1.encodeAbiParameters)([{ type: 'bytes' }, { type: 'bytes' }], [result, extraData]),
        ]);
        try {
            const { data: data_ } = await (0, call_js_1.call)({ ...client, ccipRead: false }, {
                blockNumber,
                blockTag,
                data: callbackData,
                requestOptions,
                to,
            });
            return data_;
        }
        catch (err) {
            const revertData = (0, call_js_1.getRevertErrorData)(err);
            if (revertData?.slice(0, 10) !== exports.offchainLookupSignature)
                throw err;
            return await offchainLookup(client, {
                blockNumber,
                blockTag,
                budget,
                data: revertData,
                depth: depth + 1,
                requestOptions,
                to,
            });
        }
    }
    catch (err) {
        if (requestOptions?.signal?.aborted)
            throw (0, utils_js_1.getAbortError)(requestOptions.signal);
        if ((0, utils_js_1.isAbortError)(err))
            throw err;
        throw new ccip_js_1.OffchainLookupError({
            callbackSelector,
            cause: err,
            data,
            extraData,
            sender,
            urls,
        });
    }
}
async function ccipRequest({ data, requestOptions, sender, timeout = ccipTimeout, urls, }) {
    let error = new Error('An unknown error occurred.');
    for (const url of urls) {
        if (requestOptions?.signal?.aborted)
            throw (0, utils_js_1.getAbortError)(requestOptions.signal);
        const requestUrl = url
            .replace('{sender}', sender.toLowerCase())
            .replace('{data}', data);
        const method = url.includes('{data}') ? 'GET' : 'POST';
        const body = method === 'POST' ? { data, sender } : undefined;
        const headers = method === 'POST' ? { 'Content-Type': 'application/json' } : {};
        try {
            assertCcipUrl(requestUrl);
            const { response, responseBody } = await (0, withTimeout_js_1.withTimeout)(async ({ signal: timeoutSignal }) => {
                const { signal, cleanup } = (0, http_js_1.anySignal)([
                    requestOptions?.signal,
                    timeout > 0 ? timeoutSignal : null,
                ]);
                try {
                    const response = await fetch(requestUrl, {
                        body: JSON.stringify(body),
                        headers,
                        method,
                        ...(signal ? { signal } : {}),
                    });
                    const responseBody = await (0, http_js_1.readResponseBody)(response, {
                        maxResponseBodySize: maxCcipResponseBytes,
                    });
                    return { response, responseBody };
                }
                finally {
                    cleanup();
                }
            }, {
                errorInstance: new request_js_1.TimeoutError({
                    body: body ?? { data, sender },
                    url,
                }),
                signal: true,
                timeout,
            });
            let result;
            if (response.headers.get('Content-Type')?.startsWith('application/json')) {
                result = JSON.parse(responseBody).data;
            }
            else {
                result = responseBody;
            }
            if (!response.ok) {
                error = new request_js_1.HttpRequestError({
                    body,
                    details: result?.error
                        ? (0, stringify_js_1.stringify)(result.error)
                        : response.statusText,
                    headers: response.headers,
                    status: response.status,
                    url,
                });
                continue;
            }
            if (!(0, isHex_js_1.isHex)(result)) {
                error = new ccip_js_1.OffchainLookupResponseMalformedError({
                    result,
                    url,
                });
                continue;
            }
            return result;
        }
        catch (err) {
            if (requestOptions?.signal?.aborted)
                throw (0, utils_js_1.getAbortError)(requestOptions.signal);
            if ((0, utils_js_1.isAbortError)(err))
                throw err;
            if (err instanceof request_js_1.HttpRequestError ||
                err instanceof request_js_1.TimeoutError ||
                err instanceof request_js_1.ResponseBodyTooLargeError) {
                error = err;
                continue;
            }
            error = new request_js_1.HttpRequestError({
                body,
                cause: err,
                url,
            });
        }
    }
    throw error;
}
function assertCcipUrl(url) {
    const parsed = (() => {
        try {
            return new URL(url);
        }
        catch {
            throw new request_js_1.HttpRequestError({
                details: 'CCIP Read URL is invalid.',
                url,
            });
        }
    })();
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:')
        return;
    throw new request_js_1.HttpRequestError({
        details: `CCIP Read URL scheme "${parsed.protocol.slice(0, -1)}" is not allowed.`,
        url,
    });
}
function getTransportTimeout(transport) {
    const timeout = transport.timeout ?? transport.config?.timeout;
    if (timeout !== undefined)
        return timeout;
    const timeouts = (transport.transports ?? transport.value?.transports ?? [])
        .map(getTransportTimeout)
        .filter((timeout) => timeout !== undefined);
    return timeouts.length ? Math.max(...timeouts) : undefined;
}
//# sourceMappingURL=ccip.js.map