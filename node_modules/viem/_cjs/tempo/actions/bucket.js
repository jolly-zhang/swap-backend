"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete = delete_;
exports.get = get;
exports.head = head;
exports.list = list;
exports.put = put;
const Gateway = require("../Gateway.js");
async function delete_(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/bucket/delete',
        signal,
    });
    return (await response.json());
}
async function get(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/bucket/get',
        signal,
    }).catch((error) => {
        if (error instanceof Gateway.RequestError && error.code === 'not_found')
            return null;
        throw error;
    });
    if (!response?.body)
        return null;
    const { headers } = response;
    return {
        body: response.body,
        contentType: headers.get('content-type'),
        etag: headers.get('etag'),
        expiresAt: Number(headers.get('gateway-expires-at')),
        key,
    };
}
async function head(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/bucket/head',
        signal,
    });
    return (await response.json());
}
async function list(gateway, parameters = {}) {
    const { cursor, limit, prefix, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ cursor, limit, prefix }),
        path: '/bucket/list',
        signal,
    });
    return (await response.json());
}
async function put(gateway, parameters) {
    const { key, retention, signal, value } = parameters;
    const body = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    const size = isBlob(body) ? body.size : body.byteLength;
    const contentType = parameters.contentType ??
        (typeof value === 'string' ? 'text/plain;charset=utf-8' : undefined) ??
        (isBlob(value) && value.type ? value.type : undefined) ??
        'application/octet-stream';
    const response = await Gateway.request(gateway, {
        body: body,
        headers: {
            'content-type': contentType,
            'gateway-key': key,
            'gateway-retention': String(retention),
            'gateway-size': String(size),
        },
        path: '/bucket/put',
        signal,
    });
    return (await response.json());
}
function isBlob(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.arrayBuffer === 'function' &&
        typeof value.size === 'number');
}
//# sourceMappingURL=bucket.js.map