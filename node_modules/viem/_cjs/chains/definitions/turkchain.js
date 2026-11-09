"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.turkchain = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.turkchain = (0, defineChain_js_1.defineChain)({
    id: 1919,
    name: 'Turkchain',
    nativeCurrency: {
        decimals: 18,
        name: 'TC',
        symbol: 'TURK',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.turkscan.com'],
            webSocket: ['wss://evm-ws.turkscan.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'TurkScan',
            url: 'https://turkscan.com',
        },
    },
});
//# sourceMappingURL=turkchain.js.map