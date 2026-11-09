import * as Gateway from '../Gateway.js';
import * as Ndjson from '../internal/ndjson.js';
/**
 * Embeds text with a Gateway model. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { embeddings } = await Actions.ai.embed(gateway, {
 *   input: ['hello world'],
 *   model: '@cf/baai/bge-m3',
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The embeddings and their shape.
 */
export async function embed(gateway, parameters) {
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
/**
 * Generates text with a Gateway model. Paid per request.
 *
 * Pass either `prompt` or `messages`.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { text } = await Actions.ai.generateText(gateway, {
 *   model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
 *   prompt: 'Describe this app in one sentence.',
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The generated text and token usage.
 */
export async function generateText(gateway, parameters) {
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
/**
 * Generates text with a Gateway model and yields it as it is produced. Paid
 * per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * for await (const event of Actions.ai.streamText(gateway, {
 *   model: '@cf/zai-org/glm-5.3',
 *   prompt: 'Write a haiku about Tempo.',
 * })) {
 *   if (event.type === 'text') process.stdout.write(event.delta)
 * }
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns Text and reasoning deltas, then usage.
 */
export async function* streamText(gateway, parameters) {
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