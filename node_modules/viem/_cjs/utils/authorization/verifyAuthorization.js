"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuthorization = verifyAuthorization;
const transaction_js_1 = require("../../errors/transaction.js");
const getAddress_js_1 = require("../address/getAddress.js");
const isAddressEqual_js_1 = require("../address/isAddressEqual.js");
const recoverAuthorizationAddress_js_1 = require("./recoverAuthorizationAddress.js");
async function verifyAuthorization({ address, authorization, signature, }) {
    const recovered = await (async () => {
        try {
            return await (0, recoverAuthorizationAddress_js_1.recoverAuthorizationAddress)({ authorization, signature });
        }
        catch (error) {
            if (error instanceof transaction_js_1.InvalidYParityError)
                return undefined;
            throw error;
        }
    })();
    if (!recovered)
        return false;
    return (0, isAddressEqual_js_1.isAddressEqual)((0, getAddress_js_1.getAddress)(address), recovered);
}
//# sourceMappingURL=verifyAuthorization.js.map