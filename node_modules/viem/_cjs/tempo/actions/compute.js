"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.exec = exec;
exports.list = list;
exports.read = read;
exports.snapshot = snapshot;
exports.spawn = spawn;
exports.status = status;
exports.terminate = terminate;
exports.write = write;
exports.renew = renew;
exports.stream = stream;
exports.logs = logs;
const Gateway = require("../Gateway.js");
const Ndjson = require("../internal/ndjson.js");
async function create(gateway, parameters = {}) {
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
async function exec(gateway, parameters) {
    const { command, env, sandboxId, signal, timeout, workdir } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ command, env, sandboxId, timeout, workdir }),
        path: '/compute/exec',
        signal,
    });
    return (await response.json());
}
async function list(gateway, parameters = {}) {
    const { cursor, limit, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ cursor, limit }),
        path: '/compute/list',
        signal,
    });
    return (await response.json());
}
async function read(gateway, parameters) {
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
async function snapshot(gateway, parameters) {
    const { sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId }),
        path: '/compute/snapshot',
        signal,
    });
    return (await response.json());
}
async function spawn(gateway, parameters) {
    const { command, env, sandboxId, signal, workdir } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ command, env, sandboxId, workdir }),
        path: '/compute/spawn',
        signal,
    });
    return (await response.json());
}
async function status(gateway, parameters) {
    const { sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId }),
        path: '/compute/status',
        signal,
    });
    return (await response.json());
}
async function terminate(gateway, parameters) {
    const { sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId }),
        path: '/compute/terminate',
        signal,
    });
    return (await response.json());
}
async function write(gateway, parameters) {
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
async function renew(gateway, parameters) {
    const { sandboxId, seconds, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ sandboxId, seconds }),
        path: '/compute/renew',
        signal,
    });
    return (await response.json());
}
async function* stream(gateway, parameters) {
    const { command, env, sandboxId, signal, timeout, workdir } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ command, env, sandboxId, timeout, workdir }),
        path: '/compute/stream',
        signal,
    });
    yield* Ndjson.read(response);
}
async function* logs(gateway, parameters) {
    const { logPath, offset, sandboxId, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ logPath, offset, sandboxId }),
        path: '/compute/logs',
        signal,
    });
    yield* Ndjson.read(response);
}
function isBlob(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.arrayBuffer === 'function' &&
        typeof value.size === 'number');
}
//# sourceMappingURL=compute.js.map