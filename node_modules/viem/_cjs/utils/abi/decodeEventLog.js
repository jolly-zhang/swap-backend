"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbiEventAmbiguityError = void 0;
exports.decodeEventLog = decodeEventLog;
const abi_js_1 = require("../../errors/abi.js");
const base_js_1 = require("../../errors/base.js");
const cursor_js_1 = require("../../errors/cursor.js");
const size_js_1 = require("../data/size.js");
const toEventSelector_js_1 = require("../hash/toEventSelector.js");
const decodeAbiParameters_js_1 = require("./decodeAbiParameters.js");
const formatAbiItem_js_1 = require("./formatAbiItem.js");
const docsPath = '/docs/contract/decodeEventLog';
function decodeEventLog(parameters) {
    const { abi, data, eventName, strict: strict_, topics, } = parameters;
    const strict = strict_ ?? true;
    const events = abi.filter((item) => item.type === 'event' && 'name' in item);
    const signature = topics[0];
    const bySelector = signature
        ? events.find((item) => !item.anonymous &&
            signature === (0, toEventSelector_js_1.toEventSelector)((0, formatAbiItem_js_1.formatAbiItem)(item)))
        : undefined;
    const candidates = bySelector
        ? [bySelector]
        : anonymousCandidates(events, topics.length, eventName);
    if (candidates.length > 1)
        throw new AbiEventAmbiguityError(candidates.map((item) => item.name));
    const abiItem = candidates[0];
    if (!abiItem) {
        if (!signature)
            throw new abi_js_1.AbiEventSignatureEmptyTopicsError({ docsPath });
        throw new abi_js_1.AbiEventSignatureNotFoundError(signature, { docsPath });
    }
    return decodeMatchedEventLog({
        abiItem,
        argTopics: abiItem.anonymous ? topics : topics.slice(1),
        data,
        strict,
    });
}
function anonymousCandidates(events, topicCount, eventName) {
    const requested = (() => {
        if (eventName)
            return events.filter((item) => item.name === eventName);
        if (events.every((item) => item.anonymous))
            return events;
        return [];
    })();
    return requested.filter((item) => item.anonymous && indexedCount(item) === topicCount);
}
function indexedCount(item) {
    return item.inputs?.filter((input) => input.indexed).length ?? 0;
}
function decodeMatchedEventLog({ abiItem, argTopics, data, strict, }) {
    const { name, inputs } = abiItem;
    const isUnnamed = inputs?.some((x) => !('name' in x && x.name));
    const args = isUnnamed ? [] : {};
    const indexedInputs = inputs
        .map((x, i) => [x, i])
        .filter(([x]) => 'indexed' in x && x.indexed);
    const missingIndexedInputs = [];
    for (let i = 0; i < indexedInputs.length; i++) {
        const [param, argIndex] = indexedInputs[i];
        const topic = argTopics[i];
        if (!topic) {
            if (strict)
                throw new abi_js_1.DecodeLogTopicsMismatch({
                    abiItem,
                    param: param,
                });
            missingIndexedInputs.push([param, argIndex]);
            continue;
        }
        args[isUnnamed ? argIndex : param.name || argIndex] = decodeTopic({
            param,
            value: topic,
        });
    }
    const nonIndexedInputs = inputs.filter((x) => !('indexed' in x && x.indexed));
    const inputsToDecode = strict
        ? nonIndexedInputs
        : [...missingIndexedInputs.map(([param]) => param), ...nonIndexedInputs];
    if (inputsToDecode.length > 0) {
        if (data && data !== '0x') {
            try {
                const decodedData = (0, decodeAbiParameters_js_1.decodeAbiParameters)(inputsToDecode, data);
                if (decodedData) {
                    let dataIndex = 0;
                    if (!strict) {
                        for (const [param, argIndex] of missingIndexedInputs) {
                            args[isUnnamed ? argIndex : param.name || argIndex] =
                                decodedData[dataIndex++];
                        }
                    }
                    if (isUnnamed) {
                        for (let i = 0; i < inputs.length; i++)
                            if (args[i] === undefined && dataIndex < decodedData.length)
                                args[i] = decodedData[dataIndex++];
                    }
                    else
                        for (let i = 0; i < nonIndexedInputs.length; i++)
                            args[nonIndexedInputs[i].name] = decodedData[dataIndex++];
                }
            }
            catch (err) {
                if (strict) {
                    if (err instanceof abi_js_1.AbiDecodingDataSizeTooSmallError ||
                        err instanceof cursor_js_1.PositionOutOfBoundsError)
                        throw new abi_js_1.DecodeLogDataMismatch({
                            abiItem,
                            data: data,
                            params: inputsToDecode,
                            size: (0, size_js_1.size)(data),
                        });
                    throw err;
                }
            }
        }
        else if (strict) {
            throw new abi_js_1.DecodeLogDataMismatch({
                abiItem,
                data: '0x',
                params: inputsToDecode,
                size: 0,
            });
        }
    }
    return {
        eventName: name,
        args: Object.values(args).length > 0 ? args : undefined,
    };
}
function decodeTopic({ param, value }) {
    if (param.type === 'string' ||
        param.type === 'bytes' ||
        param.type === 'tuple' ||
        param.type.match(/^(.*)\[(\d+)?\]$/))
        return value;
    const decodedArg = (0, decodeAbiParameters_js_1.decodeAbiParameters)([param], value) || [];
    return decodedArg[0];
}
class AbiEventAmbiguityError extends base_js_1.BaseError {
    constructor(eventNames) {
        const distinct = new Set(eventNames).size === eventNames.length;
        super('Ambiguous anonymous event log.', {
            docsPath,
            metaMessages: [
                `Matched ${eventNames.map((name) => `\`${name}\``).join(', ')}.`,
                'These events take the same number of indexed topics.',
                distinct
                    ? 'Pass `eventName` to choose one.'
                    : 'Pass an `abi` that holds only the event to decode.',
            ],
            name: 'AbiEventAmbiguityError',
        });
    }
}
exports.AbiEventAmbiguityError = AbiEventAmbiguityError;
//# sourceMappingURL=decodeEventLog.js.map