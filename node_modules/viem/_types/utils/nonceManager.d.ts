import type { Address } from 'abitype';
import type { Client } from '../clients/createClient.js';
import type { MaybePromise } from '../types/utils.js';
export type CreateNonceManagerParameters = {
    source: NonceManagerSource;
};
type FunctionParameters = {
    address: Address;
    chainId: number;
};
type ResetParameters = FunctionParameters & {
    /**
     * The nonce that `consume` returned for the send being reset.
     *
     * Set when a send fails after `consume` returned a nonce, and omitted
     * when `consume` threw or `reset` is called outside of a send. Managers
     * that track a nonce per send can use it to release that nonce only.
     *
     * A failed send does not prove the nonce is unused: the node may have
     * accepted the transaction before the request failed (e.g. a timeout).
     * Check the account's pending nonce before reusing a released nonce.
     */
    nonce?: number | undefined;
};
export type NonceManager = {
    /** Get and increment a nonce. */
    consume: (parameters: FunctionParameters & {
        client: Client;
    }) => Promise<number>;
    /** Increment a nonce. */
    increment: (chainId: FunctionParameters) => void;
    /** Get a nonce. */
    get: (chainId: FunctionParameters & {
        client: Client;
    }) => Promise<number>;
    /** Reset a nonce. */
    reset: (chainId: ResetParameters) => void;
};
/**
 * Creates a nonce manager for auto-incrementing transaction nonces.
 *
 * - Docs: https://viem.sh/docs/accounts/createNonceManager
 *
 * @example
 * ```ts
 * const nonceManager = createNonceManager({
 *   source: jsonRpc(),
 * })
 * ```
 */
export declare function createNonceManager(parameters: CreateNonceManagerParameters): NonceManager;
export type NonceManagerSource = {
    /** Get a nonce. */
    get(parameters: FunctionParameters & {
        client: Client;
    }): MaybePromise<number>;
    /** Set a nonce. */
    set(parameters: FunctionParameters, nonce: number): MaybePromise<void>;
};
/** JSON-RPC source for a nonce manager. */
export declare function jsonRpc(): NonceManagerSource;
/** Default Nonce Manager with a JSON-RPC source. */
export declare const nonceManager: NonceManager;
export {};
//# sourceMappingURL=nonceManager.d.ts.map