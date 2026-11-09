import { formatAbiItem } from 'abitype';
import { LruMap } from '../lru.js';
import { hashSignature } from './hashSignature.js';
import { toSignature } from './toSignature.js';
/** Signature hashes keyed by their definition, since hashing is costly. */
const signatureHashCache = /*#__PURE__*/ new LruMap(8192);
/**
 * Returns the hash (of the function/event/error signature) for a given function, event, or error definition.
 */
export function toSignatureHash(fn) {
    const definition = typeof fn === 'string' ? fn : formatAbiItem(fn);
    const cached = signatureHashCache.get(definition);
    if (cached)
        return cached;
    const hash = hashSignature(toSignature(definition));
    signatureHashCache.set(definition, hash);
    return hash;
}
//# sourceMappingURL=toSignatureHash.js.map