import type { Hex } from '../../types/misc.js';
import type { CcipRequestParameters, CcipRequestReturnType } from '../ccip.js';
export declare const localBatchGatewayUrl = "x-batch-gateway:true";
/**
 * Caps for one CCIP-Read lookup.
 *
 * - `concurrency`: gateway requests in flight at once, across nested batches.
 * - `depth`: nested callbacks, and separately, nested local batches.
 * - `queries`: gateway requests in total, across callbacks and nested batches.
 *   Each contract-chosen URL counts once, and a query with none counts once.
 *   Gateways a custom `ccipRead.request` adds (such as `ccipReadTunnel`'s
 *   `batchGateways`) are the caller's own and are not counted separately.
 */
export declare const ccipReadLimit: {
    readonly concurrency: 16;
    readonly depth: 4;
    readonly queries: 256;
};
/** Query and concurrency budget shared by every request of one lookup. */
export type CcipReadBudget = {
    /** Gateway requests still allowed. */
    queries: number;
    /** Runs a gateway request once a concurrency slot is free. */
    run: <result>(fn: () => Promise<result>) => Promise<result>;
};
/** Creates the budget for one CCIP-Read lookup. */
export declare function createCcipReadBudget(): CcipReadBudget;
export declare function localBatchGatewayRequest(parameters: {
    data: Hex;
    ccipRequest: (parameters: CcipRequestParameters) => Promise<CcipRequestReturnType>;
    budget?: CcipReadBudget | undefined;
    depth?: number | undefined;
}): Promise<Hex>;
//# sourceMappingURL=localBatchGatewayRequest.d.ts.map