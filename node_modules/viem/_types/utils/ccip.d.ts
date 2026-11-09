import type { Address } from 'abitype';
import { type CallParameters } from '../actions/public/call.js';
import type { Client } from '../clients/createClient.js';
import type { Transport } from '../clients/transports/createTransport.js';
import { type OffchainLookupErrorType as OffchainLookupErrorType_, type OffchainLookupResponseMalformedErrorType } from '../errors/ccip.js';
import { type HttpRequestErrorType, type ResponseBodyTooLargeErrorType, type TimeoutErrorType } from '../errors/request.js';
import { type ErrorType } from '../errors/utils.js';
import type { Chain } from '../types/chain.js';
import type { EIP1193RequestOptions } from '../types/eip1193.js';
import type { Hex } from '../types/misc.js';
import { type CcipReadBudget } from './ens/localBatchGatewayRequest.js';
export declare const offchainLookupSignature = "0x556f1830";
export declare const offchainLookupAbiItem: {
    readonly name: "OffchainLookup";
    readonly type: "error";
    readonly inputs: readonly [{
        readonly name: "sender";
        readonly type: "address";
    }, {
        readonly name: "urls";
        readonly type: "string[]";
    }, {
        readonly name: "callData";
        readonly type: "bytes";
    }, {
        readonly name: "callbackFunction";
        readonly type: "bytes4";
    }, {
        readonly name: "extraData";
        readonly type: "bytes";
    }];
};
export type OffchainLookupErrorType = OffchainLookupErrorType_ | ErrorType;
/**
 * Performs an EIP-3668 CCIP-Read lookup for a reverted `OffchainLookup` call.
 *
 * Follows at most 4 nested callbacks. Every gateway request of the lookup,
 * including nested local batches, draws from one query and concurrency budget.
 * Each gateway request uses the client transport timeout.
 */
export declare function offchainLookup<chain extends Chain | undefined>(client: Client<Transport, chain>, { blockNumber, blockTag, budget, data, depth, requestOptions, to, }: Pick<CallParameters, 'blockNumber' | 'blockTag' | 'requestOptions'> & {
    /** Budget shared by the callbacks of one lookup. */
    budget?: CcipReadBudget | undefined;
    data: Hex;
    /** Callbacks already followed in this lookup. */
    depth?: number | undefined;
    to: Address;
}): Promise<Hex>;
export type CcipRequestParameters = {
    data: Hex;
    requestOptions?: EIP1193RequestOptions | undefined;
    sender: Address;
    /** The timeout (in ms) for each gateway request. Default: 10_000 */
    timeout?: number | undefined;
    urls: readonly string[];
};
export type CcipRequestReturnType = Hex;
export type CcipRequestErrorType = HttpRequestErrorType | OffchainLookupResponseMalformedErrorType | ResponseBodyTooLargeErrorType | TimeoutErrorType | ErrorType;
/**
 * Requests a CCIP-Read gateway result.
 *
 * Tries each HTTP(S) URL in order. Each request, including the response body,
 * times out after `timeout` (default 10 seconds) and reads at most 10 MiB.
 */
export declare function ccipRequest({ data, requestOptions, sender, timeout, urls, }: CcipRequestParameters): Promise<CcipRequestReturnType>;
//# sourceMappingURL=ccip.d.ts.map