import * as Gateway from '../Gateway.js';
import * as Ndjson from '../internal/ndjson.js';
/**
 * Starts a sandbox that can live up to `timeout` seconds, from a container image
 * with optional `apt/pip` layers or from a snapshot. Compute is metered: creation
 * pays for `lease` seconds at the sandbox's GPU, CPU, and memory rate (see
 * `Gateway.getCapabilities`), and `renew` pays for more. `ports` are served
 * over public HTTPS tunnels returned in `tunnels`.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const sandbox = await Actions.compute.create(gateway, {
 *   gpu: 'T4',
 *   image: 'pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime',
 *   ports: [8000],
 *   timeout: 1200,
 * })
 * const url = sandbox.tunnels[8000]
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The sandbox and its tunnels.
 */
export async function create(gateway, parameters = {}) {
    const { apt, blockNetwork, cpu, env, gpu, gpuCount, idleTimeout, image, lease, memory, pip, ports, signal, snapshot, timeout, workdir, } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({
            apt,
            blockNetwork,
            cpu,
            env,
            gpu,
            gpuCount,
            idleTimeout,
            image,
            lease,
            memory,
            pip,
            ports,
            snapshot,
            timeout,
            workdir,
        }),
        path: '/compute/create',
        signal,
    });
    return (await response.json());
}
/**
 * Runs a command in a sandbox and waits up to `timeout` seconds (at most 120)
 * for it to finish. Use `spawn` for longer jobs. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { exitCode, stdout } = await Actions.compute.exec(gateway, {
 *   command: ['python', '-c', 'print(1 + 1)'],
 *   sandboxId: sandbox.sandboxId,
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The command's output and exit code.
 */
export async function exec(gateway, parameters) {
    const { command, env, sandboxId, signal, timeout, workdir } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ command, env, sandboxId, timeout, workdir }),
        path: '/compute/exec',
        signal,
    });
    return (await response.json());
}
/**
 * Lists the app's sandboxes that have not ended. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { sandboxes } = await Actions.compute.list(gateway)
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns A page of sandboxes and the next cursor.
 */
export async function list(gateway, parameters = {}) {
    const { cursor, limit, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ cursor, limit }),
        path: '/compute/list',
        signal,
    });
    return (await response.json());
}
/**
 * Reads a file from a sandbox, from `offset` for up to `length` bytes (8 MiB
 * per request). Returns `null` when the file does not exist. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const log = await Actions.compute.read(gateway, {
 *   offset: 0,
 *   path: job.logPath,
 *   sandboxId: sandbox.sandboxId,
 * })
 * const text = log && (await new Response(log.body).text())
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The bytes read and the whole file size, or `null`.
 */
export async function read(gateway, parameters) {
    const { length, offset, path, sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ length, offset, path, sandboxId }),
        path: '/compute/read',
        signal,
    }).catch((error) => {
        if (error instanceof Gateway.RequestError && error.code === 'not_found')
            return null;
        throw error;
    });
    if (!response?.body)
        return null;
    return {
        body: response.body,
        offset: offset ?? 0,
        size: Number(response.headers.get('gateway-file-size')),
    };
}
/**
 * Saves a sandbox's filesystem as a snapshot kept for 30 days. Pass it to
 * `create` to start new sandboxes from it. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { snapshot } = await Actions.compute.snapshot(gateway, {
 *   sandboxId: sandbox.sandboxId,
 * })
 * const copy = await Actions.compute.create(gateway, { snapshot })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The snapshot ID and its expiry.
 */
export async function snapshot(gateway, parameters) {
    const { sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId }),
        path: '/compute/snapshot',
        signal,
    });
    return (await response.json());
}
/**
 * Starts a command in the background and returns at once. Its output goes to
 * `logPath` and its exit code to `exitPath` when it finishes; poll both with
 * `read`. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const job = await Actions.compute.spawn(gateway, {
 *   command: ['python', 'train.py'],
 *   sandboxId: sandbox.sandboxId,
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The process ID and the paths of its log and exit code.
 */
export async function spawn(gateway, parameters) {
    const { command, env, sandboxId, signal, workdir } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ command, env, sandboxId, workdir }),
        path: '/compute/spawn',
        signal,
    });
    return (await response.json());
}
/**
 * Reads whether a sandbox is running. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { status } = await Actions.compute.status(gateway, {
 *   sandboxId: sandbox.sandboxId,
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The sandbox and its status.
 */
export async function status(gateway, parameters) {
    const { sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId }),
        path: '/compute/status',
        signal,
    });
    return (await response.json());
}
/**
 * Terminates a sandbox. The Gateway credits the unused rest of its lease back
 * to the payment channel. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * await Actions.compute.terminate(gateway, { sandboxId: sandbox.sandboxId })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The final status.
 */
export async function terminate(gateway, parameters) {
    const { sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId }),
        path: '/compute/terminate',
        signal,
    });
    return (await response.json());
}
/**
 * Writes a file into a sandbox at an absolute path, creating its directories.
 * Up to 8 MiB. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * await Actions.compute.write(gateway, {
 *   path: '/root/train.py',
 *   sandboxId: sandbox.sandboxId,
 *   value: 'print("training")',
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The path and size written.
 */
export async function write(gateway, parameters) {
    const { path, sandboxId, signal, value } = parameters;
    const body = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    const size = isBlob(body) ? body.size : body.byteLength;
    const response = await Gateway.request(gateway, {
        body: body,
        headers: {
            'content-type': 'application/octet-stream',
            'gateway-path': path,
            'gateway-sandbox': sandboxId,
            'gateway-size': String(size),
        },
        path: '/compute/write',
        signal,
    });
    return (await response.json());
}
/**
 * Pays for more seconds of a sandbox at its per-second rate, up to its
 * `timeout`. A sandbox whose `paidUntil` passes is terminated within about a
 * minute. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * const { paidUntil } = await Actions.compute.renew(gateway, {
 *   sandboxId: sandbox.sandboxId,
 *   seconds: 300,
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The sandbox with its new `paidUntil`.
 */
export async function renew(gateway, parameters) {
    const { sandboxId, seconds, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId, seconds }),
        path: '/compute/renew',
        signal,
    });
    return (await response.json());
}
/**
 * Runs a command in a sandbox and yields its output as it is written, then
 * its exit. Up to `timeout` seconds (at most 3600). Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * for await (const event of Actions.compute.stream(gateway, {
 *   command: ['python', 'train.py'],
 *   sandboxId: sandbox.sandboxId,
 * })) {
 *   if (event.type === 'exit') console.log('exit', event.exitCode)
 *   else process.stdout.write(event.data)
 * }
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns Output and exit events.
 */
export async function* stream(gateway, parameters) {
    const { command, env, sandboxId, signal, timeout, workdir } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ command, env, sandboxId, timeout, workdir }),
        path: '/compute/stream',
        signal,
    });
    yield* Ndjson.read(response);
}
/**
 * Follows the log of a command started with `spawn` from `offset` and yields
 * it as it grows, then the exit code. After an hour it yields `end` with the
 * offset to resume from. Paid per request.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 *
 * for await (const event of Actions.compute.logs(gateway, {
 *   logPath: job.logPath,
 *   sandboxId: sandbox.sandboxId,
 * })) {
 *   if (event.type === 'log') process.stdout.write(event.data)
 * }
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns Log, exit, and end events.
 */
export async function* logs(gateway, parameters) {
    const { logPath, offset, sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ logPath, offset, sandboxId }),
        path: '/compute/logs',
        signal,
    });
    yield* Ndjson.read(response);
}
/** Detects a `Blob` without `instanceof`, so ones from another realm count. */
function isBlob(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.arrayBuffer === 'function' &&
        typeof value.size === 'number');
}
//# sourceMappingURL=compute.js.map