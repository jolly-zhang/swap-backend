"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete = delete_;
exports.get = get;
exports.list = list;
exports.set = set;
const Gateway = require("../Gateway.js");
async function delete_(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/kv/delete',
        signal,
    });
    return (await response.json());
}
async function get(gateway, parameters) {
    const { key, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ key }),
        path: '/kv/get',
        signal,
    });
    return (await response.json());
}
async function list(gateway, parameters = {}) {
    const { cursor, limit, prefix, signal } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ cursor, limit, prefix }),
        path: '/kv/list',
        signal,
    });
    return (await response.json());
}
async function set(gateway, parameters) {
    const { ifVersion, key, signal, ttl, value } = parameters;
    const response = await Gateway.request(gateway, {
        body: JSON.stringify({ ifVersion, key, ttl, value }),
        path: '/kv/set',
        signal,
    });
    return (await response.json());
}
//# sourceMappingURL=kv.js.map