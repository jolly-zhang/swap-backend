"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSignatureHash = toSignatureHash;
const abitype_1 = require("abitype");
const lru_js_1 = require("../lru.js");
const hashSignature_js_1 = require("./hashSignature.js");
const toSignature_js_1 = require("./toSignature.js");
const signatureHashCache = new lru_js_1.LruMap(8192);
function toSignatureHash(fn) {
    const definition = typeof fn === 'string' ? fn : (0, abitype_1.formatAbiItem)(fn);
    const cached = signatureHashCache.get(definition);
    if (cached)
        return cached;
    const hash = (0, hashSignature_js_1.hashSignature)((0, toSignature_js_1.toSignature)(definition));
    signatureHashCache.set(definition, hash);
    return hash;
}
//# sourceMappingURL=toSignatureHash.js.map