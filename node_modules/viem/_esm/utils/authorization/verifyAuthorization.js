import { InvalidYParityError } from '../../errors/transaction.js';
import { getAddress } from '../address/getAddress.js';
import { isAddressEqual, } from '../address/isAddressEqual.js';
import { recoverAuthorizationAddress, } from './recoverAuthorizationAddress.js';
/**
 * Verify that an Authorization object was signed by the provided address.
 *
 * - Docs {@link https://viem.sh/docs/utilities/verifyAuthorization}
 *
 * @param parameters - {@link VerifyAuthorizationParameters}
 * @returns Whether or not the signature is valid. {@link VerifyAuthorizationReturnType}
 */
export async function verifyAuthorization({ address, authorization, signature, }) {
    const recovered = await (async () => {
        try {
            return await recoverAuthorizationAddress({ authorization, signature });
        }
        catch (error) {
            // A `yParity` other than 0 or 1 has no authority under EIP-7702.
            if (error instanceof InvalidYParityError)
                return undefined;
            throw error;
        }
    })();
    if (!recovered)
        return false;
    return isAddressEqual(getAddress(address), recovered);
}
//# sourceMappingURL=verifyAuthorization.js.map