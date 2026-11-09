import { AbiDecodingDataSizeTooSmallError, AbiEventSignatureEmptyTopicsError, AbiEventSignatureNotFoundError, DecodeLogDataMismatch, DecodeLogTopicsMismatch, } from '../../errors/abi.js';
import { BaseError } from '../../errors/base.js';
import { PositionOutOfBoundsError } from '../../errors/cursor.js';
import { size } from '../data/size.js';
import { toEventSelector, } from '../hash/toEventSelector.js';
import { decodeAbiParameters, } from './decodeAbiParameters.js';
import { formatAbiItem } from './formatAbiItem.js';
const docsPath = '/docs/contract/decodeEventLog';
export function decodeEventLog(parameters) {
    const { abi, data, eventName, strict: strict_, topics, } = parameters;
    const strict = strict_ ?? true;
    const events = abi.filter((item) => item.type === 'event' && 'name' in item);
    // Anonymous events omit the signature topic, so `topics[0]` is an indexed
    // argument. A signature match still wins when the log has one.
    const signature = topics[0];
    const bySelector = signature
        ? events.find((item) => !item.anonymous &&
            signature === toEventSelector(formatAbiItem(item)))
        : undefined;
    const candidates = bySelector
        ? [bySelector]
        : anonymousCandidates(events, topics.length, eventName);
    if (candidates.length > 1)
        throw new AbiEventAmbiguityError(candidates.map((item) => item.name));
    const abiItem = candidates[0];
    if (!abiItem) {
        if (!signature)
            throw new AbiEventSignatureEmptyTopicsError({ docsPath });
        throw new AbiEventSignatureNotFoundError(signature, { docsPath });
    }
    return decodeMatchedEventLog({
        abiItem,
        argTopics: abiItem.anonymous ? topics : topics.slice(1),
        data,
        strict,
    });
}
function anonymousCandidates(events, topicCount, eventName) {
    // Nothing in a log identifies an anonymous event, so any log with the same
    // topic count fits it. Anonymous events are only considered when requested:
    // `eventName` names one, or every event in the ABI is anonymous. Otherwise a
    // log from another contract is decoded as the anonymous event.
    const requested = (() => {
        if (eventName)
            return events.filter((item) => item.name === eventName);
        if (events.every((item) => item.anonymous))
            return events;
        return [];
    })();
    // `eventName` does not skip the arity check, or a same-name overload with
    // extra topics is guessed.
    return requested.filter((item) => item.anonymous && indexedCount(item) === topicCount);
}
function indexedCount(item) {
    return item.inputs?.filter((input) => input.indexed).length ?? 0;
}
function decodeMatchedEventLog({ abiItem, argTopics, data, strict, }) {
    const { name, inputs } = abiItem;
    const isUnnamed = inputs?.some((x) => !('name' in x && x.name));
    const args = isUnnamed ? [] : {};
    // Decode topics (indexed args).
    const indexedInputs = inputs
        .map((x, i) => [x, i])
        .filter(([x]) => 'indexed' in x && x.indexed);
    const missingIndexedInputs = [];
    for (let i = 0; i < indexedInputs.length; i++) {
        const [param, argIndex] = indexedInputs[i];
        const topic = argTopics[i];
        if (!topic) {
            if (strict)
                throw new DecodeLogTopicsMismatch({
                    abiItem,
                    param: param,
                });
            // Track missing indexed inputs to decode from data when strict is false
            missingIndexedInputs.push([param, argIndex]);
            continue;
        }
        args[isUnnamed ? argIndex : param.name || argIndex] = decodeTopic({
            param,
            value: topic,
        });
    }
    // Decode data (non-indexed args + missing indexed args when strict is false).
    const nonIndexedInputs = inputs.filter((x) => !('indexed' in x && x.indexed));
    // When strict is false, missing indexed inputs should be decoded from data
    const inputsToDecode = strict
        ? nonIndexedInputs
        : [...missingIndexedInputs.map(([param]) => param), ...nonIndexedInputs];
    if (inputsToDecode.length > 0) {
        if (data && data !== '0x') {
            try {
                const decodedData = decodeAbiParameters(inputsToDecode, data);
                if (decodedData) {
                    let dataIndex = 0;
                    // First, assign missing indexed parameters (when strict is false)
                    if (!strict) {
                        for (const [param, argIndex] of missingIndexedInputs) {
                            args[isUnnamed ? argIndex : param.name || argIndex] =
                                decodedData[dataIndex++];
                        }
                    }
                    // Then, assign non-indexed parameters
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
                    if (err instanceof AbiDecodingDataSizeTooSmallError ||
                        err instanceof PositionOutOfBoundsError)
                        throw new DecodeLogDataMismatch({
                            abiItem,
                            data: data,
                            params: inputsToDecode,
                            size: size(data),
                        });
                    throw err;
                }
            }
        }
        else if (strict) {
            throw new DecodeLogDataMismatch({
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
    const decodedArg = decodeAbiParameters([param], value) || [];
    return decodedArg[0];
}
/**
 * Thrown by {@link decodeEventLog} when an anonymous event log fits more than
 * one requested anonymous event with the same number of indexed inputs.
 */
export class AbiEventAmbiguityError extends BaseError {
    constructor(eventNames) {
        // `eventName` cannot choose between overloads that share a name, so those
        // need an ABI narrowed to one event.
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
//# sourceMappingURL=decodeEventLog.js.map