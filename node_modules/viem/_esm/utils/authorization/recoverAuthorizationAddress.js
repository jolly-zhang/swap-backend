import { InvalidYParityError, } from '../../errors/transaction.js';
import { recoverAddress, } from '../signature/recoverAddress.js';
import { hashAuthorization, } from './hashAuthorization.js';
export async function recoverAuthorizationAddress(parameters) {
    const { authorization } = parameters;
    const signature = (parameters.signature ?? authorization);
    // EIP-7702 recovers the authority with `y_parity` as the raw recovery id, so a
    // tuple with any other `yParity` (such as 27 or 28) has no authority.
    if (typeof signature === 'object' &&
        typeof signature.yParity === 'number' &&
        signature.yParity !== 0 &&
        signature.yParity !== 1)
        throw new InvalidYParityError({ yParity: BigInt(signature.yParity) });
    return recoverAddress({
        hash: hashAuthorization(authorization),
        signature,
    });
}
//# sourceMappingURL=recoverAuthorizationAddress.js.map