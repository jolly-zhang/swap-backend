"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverAuthorizationAddress = recoverAuthorizationAddress;
const transaction_js_1 = require("../../errors/transaction.js");
const recoverAddress_js_1 = require("../signature/recoverAddress.js");
const hashAuthorization_js_1 = require("./hashAuthorization.js");
async function recoverAuthorizationAddress(parameters) {
    const { authorization } = parameters;
    const signature = (parameters.signature ?? authorization);
    if (typeof signature === 'object' &&
        typeof signature.yParity === 'number' &&
        signature.yParity !== 0 &&
        signature.yParity !== 1)
        throw new transaction_js_1.InvalidYParityError({ yParity: BigInt(signature.yParity) });
    return (0, recoverAddress_js_1.recoverAddress)({
        hash: (0, hashAuthorization_js_1.hashAuthorization)(authorization),
        signature,
    });
}
//# sourceMappingURL=recoverAuthorizationAddress.js.map