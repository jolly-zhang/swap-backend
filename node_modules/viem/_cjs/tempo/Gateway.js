"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionConflictError = exports.MppxNotInstalledError = exports.ChainMismatchError = exports.InsufficientFundsError = exports.PaymentRequiredError = exports.RequestError = exports.InvalidAppError = void 0;
exports.from = from;
exports.getCapabilities = getCapabilities;
exports.request = request;
const base_js_1 = require("../errors/base.js");
const formatUnits_js_1 = require("../utils/unit/formatUnits.js");
const defaultUrl = 'https://gateway.tempo-dev.workers.dev';
function from(options = {}) {
    const { app = 'default', url = defaultUrl } = options;
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(app))
        throw new InvalidAppError({ app });
    return {
        app,
        fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
        url: trimSlashes(url),
    };
}
function trimSlashes(url) {
    let end = url.length;
    while (end > 0 && url[end - 1] === '/')
        end--;
    return url.slice(0, end);
}
async function getCapabilities(gateway, options = {}) {
    const response = await request(gateway, {
        method: 'GET',
        path: '/capabilities',
        signal: options.signal,
    });
    return (await response.json());
}
async function request(gateway, options) {
    const { body, method = 'POST', path, signal } = options;
    const url = `${gateway.url}/v1${path}`;
    const headers = new Headers(options.headers);
    if (!headers.has('gateway-app'))
        headers.set('gateway-app', gateway.app);
    if (typeof body === 'string' && !headers.has('content-type'))
        headers.set('content-type', 'application/json');
    const response = await gateway.fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body } : {}),
        ...(signal ? { signal } : {}),
    });
    if (response.ok)
        return response;
    const text = await response.text().catch(() => '');
    const problem = (() => {
        try {
            return JSON.parse(text);
        }
        catch {
            return {};
        }
    })();
    const parameters = {
        code: (() => {
            if (typeof problem.code === 'string')
                return problem.code;
            if (response.status === 402)
                return 'payment_required';
            return 'unknown';
        })(),
        detail: typeof problem.detail === 'string' ? problem.detail : text,
        status: response.status,
        url,
    };
    if (response.status === 402)
        throw new PaymentRequiredError(parameters);
    if (parameters.code === 'version_conflict')
        throw new VersionConflictError(parameters);
    throw new RequestError(parameters);
}
class InvalidAppError extends base_js_1.BaseError {
    constructor({ app }) {
        super(`App "${app}" is not a valid Gateway app namespace.`, {
            metaMessages: ['Use 1 to 63 lowercase letters, digits, or hyphens.'],
            name: 'Gateway.InvalidAppError',
        });
    }
}
exports.InvalidAppError = InvalidAppError;
class RequestError extends base_js_1.BaseError {
    constructor(parameters, options = {}) {
        const { code, detail, status, url } = parameters;
        super(options.shortMessage ?? 'Gateway request failed.', {
            details: detail,
            metaMessages: [`Code: ${code}`, `Status: ${status}`, `URL: ${url}`],
            name: options.name ?? 'Gateway.RequestError',
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "detail", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.code = code;
        this.detail = detail;
        this.status = status;
        this.url = url;
    }
}
exports.RequestError = RequestError;
class PaymentRequiredError extends RequestError {
    constructor(parameters) {
        super(parameters, {
            name: 'Gateway.PaymentRequiredError',
            shortMessage: 'Gateway requires payment. Give the Client an account (with mppx installed), or pass a payment-aware fetch to gatewayActions.',
        });
    }
}
exports.PaymentRequiredError = PaymentRequiredError;
class InsufficientFundsError extends base_js_1.BaseError {
    constructor({ address, balances, cause }) {
        const held = balances
            .map(({ amount, symbol }) => `${(0, formatUnits_js_1.formatUnits)(amount, 6)} ${symbol}`)
            .join(' and ');
        super(`The account ${address} can't pay the Gateway${held ? `: it holds ${held}` : ''}.`, {
            ...(cause ? { cause } : {}),
            metaMessages: [
                'Fund it with OUSD (send it from any wallet), or with MACH through Tempo Wallet (wallet.deposit). MACH cannot be transferred to a new address.',
            ],
            name: 'Gateway.InsufficientFundsError',
        });
        Object.defineProperty(this, "address", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "balances", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.address = address;
        this.balances = balances;
    }
}
exports.InsufficientFundsError = InsufficientFundsError;
class ChainMismatchError extends base_js_1.BaseError {
    constructor({ chainId, expected }) {
        super(`The Gateway asks for payment on chain ${chainId}, but the Client is on chain ${expected}.`, {
            metaMessages: [
                'Create the Client on the chain the Gateway is paid on (see getCapabilities().chainId).',
            ],
            name: 'Gateway.ChainMismatchError',
        });
    }
}
exports.ChainMismatchError = ChainMismatchError;
class MppxNotInstalledError extends base_js_1.BaseError {
    constructor({ cause } = {}) {
        super('mppx is required to pay the Gateway with the Client account.', {
            cause,
            metaMessages: [
                'Install it (npm i mppx), or pass a payment-aware fetch to gatewayActions.',
            ],
            name: 'Gateway.MppxNotInstalledError',
        });
    }
}
exports.MppxNotInstalledError = MppxNotInstalledError;
class VersionConflictError extends RequestError {
    constructor(parameters) {
        super(parameters, {
            name: 'Gateway.VersionConflictError',
            shortMessage: 'Stored version does not match ifVersion.',
        });
    }
}
exports.VersionConflictError = VersionConflictError;
//# sourceMappingURL=Gateway.js.map