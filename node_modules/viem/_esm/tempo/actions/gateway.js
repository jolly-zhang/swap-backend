import * as Gateway from '../Gateway.js';
/**
 * Reads the Gateway's free discovery document: chain, currencies, prices,
 * limits, and models.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Actions, Gateway } from 'viem/tempo'
 *
 * const capabilities = await Actions.gateway.getCapabilities(Gateway.from())
 * ```
 *
 * @param gateway - Gateway connection.
 * @param parameters - Parameters.
 * @returns The Gateway capabilities.
 */
export async function getCapabilities(gateway, parameters = {}) {
    return Gateway.getCapabilities(gateway, parameters);
}
//# sourceMappingURL=gateway.js.map