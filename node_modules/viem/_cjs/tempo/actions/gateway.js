"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCapabilities = getCapabilities;
const Gateway = require("../Gateway.js");
async function getCapabilities(gateway, parameters = {}) {
    return Gateway.getCapabilities(gateway, parameters);
}
//# sourceMappingURL=gateway.js.map