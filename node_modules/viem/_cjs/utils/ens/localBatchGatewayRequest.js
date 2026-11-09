"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ccipReadLimit = exports.localBatchGatewayUrl = void 0;
exports.createCcipReadBudget = createCcipReadBudget;
exports.localBatchGatewayRequest = localBatchGatewayRequest;
const abis_js_1 = require("../../constants/abis.js");
const solidity_js_1 = require("../../constants/solidity.js");
const request_js_1 = require("../../errors/request.js");
const decodeFunctionData_js_1 = require("../abi/decodeFunctionData.js");
const encodeErrorResult_js_1 = require("../abi/encodeErrorResult.js");
const encodeFunctionResult_js_1 = require("../abi/encodeFunctionResult.js");
exports.localBatchGatewayUrl = 'x-batch-gateway:true';
exports.ccipReadLimit = {
    concurrency: 16,
    depth: 4,
    queries: 256,
};
function createCcipReadBudget() {
    let active = 0;
    const queue = [];
    return {
        queries: exports.ccipReadLimit.queries,
        async run(fn) {
            if (active >= exports.ccipReadLimit.concurrency)
                await new Promise((resolve) => queue.push(resolve));
            else
                active++;
            try {
                return await fn();
            }
            finally {
                const next = queue.shift();
                if (next)
                    next();
                else
                    active--;
            }
        },
    };
}
async function localBatchGatewayRequest(parameters) {
    const { data, ccipRequest, budget = createCcipReadBudget(), depth = 0, } = parameters;
    const { args: [queries], } = (0, decodeFunctionData_js_1.decodeFunctionData)({ abi: abis_js_1.batchGatewayAbi, data });
    const failures = [];
    const responses = [];
    await Promise.all(queries.map(async (query, i) => {
        try {
            const nested = query.urls.includes(exports.localBatchGatewayUrl);
            if (nested && depth + 1 >= exports.ccipReadLimit.depth)
                throw new request_js_1.HttpRequestError({
                    details: `CCIP Read exceeded the maximum batch depth (${exports.ccipReadLimit.depth}).`,
                    url: exports.localBatchGatewayUrl,
                });
            if (nested)
                responses[i] = await localBatchGatewayRequest({
                    data: query.data,
                    ccipRequest,
                    budget,
                    depth: depth + 1,
                });
            else {
                if (budget.queries <= 0)
                    throw new request_js_1.HttpRequestError({
                        details: `CCIP Read exceeded the maximum number of queries (${exports.ccipReadLimit.queries}).`,
                        url: query.urls[0] ?? '',
                    });
                const urls = query.urls.slice(0, budget.queries);
                budget.queries -= Math.max(1, urls.length);
                responses[i] = await budget.run(() => ccipRequest({ ...query, urls }));
            }
            failures[i] = false;
        }
        catch (err) {
            failures[i] = true;
            responses[i] = encodeError(err);
        }
    }));
    return (0, encodeFunctionResult_js_1.encodeFunctionResult)({
        abi: abis_js_1.batchGatewayAbi,
        functionName: 'query',
        result: [failures, responses],
    });
}
function encodeError(error) {
    if (error.name === 'HttpRequestError' && error.status)
        return (0, encodeErrorResult_js_1.encodeErrorResult)({
            abi: abis_js_1.batchGatewayAbi,
            errorName: 'HttpError',
            args: [error.status, error.shortMessage],
        });
    return (0, encodeErrorResult_js_1.encodeErrorResult)({
        abi: [solidity_js_1.solidityError],
        errorName: 'Error',
        args: ['shortMessage' in error ? error.shortMessage : error.message],
    });
}
//# sourceMappingURL=localBatchGatewayRequest.js.map