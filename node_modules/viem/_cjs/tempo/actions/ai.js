"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embed = embed;
exports.generateText = generateText;
exports.streamText = streamText;
const Gateway = require("../Gateway.js");
const Ndjson = require("../internal/ndjson.js");
async function embed(gateway, parameters) {
    const { input, model, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({
            input: typeof input === 'string' ? [input] : input,
            model,
        }),
        path: '/ai/embed',
        signal,
    });
    return (await response.json());
}
async function generateText(gateway, parameters) {
    const { maxOutputTokens, messages, model, prompt, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ maxOutputTokens, messages, model, prompt }),
        path: '/ai/generate',
        signal,
    });
    const { text, usage } = (await response.json());
    return {
        text,
        usage: usage
            ? {
                inputTokens: usage.prompt_tokens,
                outputTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
            }
            : undefined,
    };
}
async function* streamText(gateway, parameters) {
    const { maxOutputTokens, messages, model, prompt, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({
            maxOutputTokens,
            messages,
            model,
            prompt,
            stream: true,
        }),
        path: '/ai/generate',
        signal,
    });
    for await (const event of Ndjson.read(response)) {
        if (event.type !== 'done') {
            yield event;
            continue;
        }
        yield {
            type: 'done',
            usage: event.usage
                ? {
                    inputTokens: event.usage.prompt_tokens,
                    outputTokens: event.usage.completion_tokens,
                    totalTokens: event.usage.total_tokens,
                }
                : undefined,
        };
    }
}
//# sourceMappingURL=ai.js.map