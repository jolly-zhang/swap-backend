import { BaseError } from '../errors/base.js';
import { formatUnits } from '../utils/unit/formatUnits.js';
const defaultUrl = 'https://gateway.tempo-dev.workers.dev';
/**
 * Creates a {@link Gateway} connection.
 *
 * Viem does not pay for requests: pass a payment-aware `fetch`, such as
 * `mppx`'s client fetch, to pay for each operation. A plain `fetch` reaches
 * only the free routes; paid routes throw {@link PaymentRequiredError}.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Mppx, tempo } from 'mppx/client'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Gateway } from 'viem/tempo'
 *
 * const mppx = Mppx.create({
 *   methods: [tempo({ account: privateKeyToAccount('0x...') })],
 *   polyfill: false,
 * })
 *
 * const gateway = Gateway.from({ fetch: mppx.fetch })
 * ```
 *
 * @param options - Options.
 * @returns The Gateway connection.
 */
export function from(options = {}) {
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
/**
 * Reads the free discovery document of a Gateway: chain, currencies, prices,
 * limits, and models.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from()
 * const capabilities = await Gateway.getCapabilities(gateway)
 * ```
 *
 * @param gateway - Gateway connection.
 * @param options - Options.
 * @returns The Gateway capabilities.
 */
export async function getCapabilities(gateway, options = {}) {
    const response = await request(gateway, {
        method: 'GET',
        path: '/capabilities',
        signal: options.signal,
    });
    return (await response.json());
}
/**
 * Sends a request to a Gateway route under `/v1` and returns the successful
 * response. Problem responses throw a {@link RequestError}.
 *
 * Prefer the typed `ai`, `bucket`, `compute`, and `kv` actions.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { Gateway } from 'viem/tempo'
 *
 * const gateway = Gateway.from()
 * const response = await Gateway.request(gateway, {
 *   body: JSON.stringify({ key: 'greeting' }),
 *   path: '/kv/get',
 * })
 * ```
 *
 * @param gateway - Gateway connection.
 * @param options - Options.
 * @returns The successful response.
 */
export async function request(gateway, options) {
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
/**
 * Thrown when an app namespace does not match `[a-z0-9][a-z0-9-]{0,62}`.
 *
 * @experimental
 */
export class InvalidAppError extends BaseError {
    constructor({ app }) {
        super(`App "${app}" is not a valid Gateway app namespace.`, {
            metaMessages: ['Use 1 to 63 lowercase letters, digits, or hyphens.'],
            name: 'Gateway.InvalidAppError',
        });
    }
}
/**
 * Thrown when a Gateway responds with a problem.
 *
 * @experimental
 */
export class RequestError extends BaseError {
    constructor(parameters, options = {}) {
        const { code, detail, status, url } = parameters;
        super(options.shortMessage ?? 'Gateway request failed.', {
            details: detail,
            metaMessages: [`Code: ${code}`, `Status: ${status}`, `URL: ${url}`],
            name: options.name ?? 'Gateway.RequestError',
        });
        /** Stable problem code, such as `not_found` or `invalid_request`. */
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Problem detail. */
        Object.defineProperty(this, "detail", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** HTTP status. */
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Request URL. */
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
/**
 * Thrown when a Gateway asks for payment that the supplied `fetch` did not
 * provide. Pass a payment-aware `fetch` to {@link from}.
 *
 * @experimental
 */
export class PaymentRequiredError extends RequestError {
    constructor(parameters) {
        super(parameters, {
            name: 'Gateway.PaymentRequiredError',
            shortMessage: 'Gateway requires payment. Give the Client an account (with mppx installed), or pass a payment-aware fetch to gatewayActions.',
        });
    }
}
/**
 * Thrown when the Client's account holds too little of the Gateway's
 * currencies to pay for a request.
 *
 * @experimental
 */
export class InsufficientFundsError extends BaseError {
    constructor({ address, balances, cause }) {
        const held = balances
            .map(({ amount, symbol }) => `${formatUnits(amount, 6)} ${symbol}`)
            .join(' and ');
        super(`The account ${address} can't pay the Gateway${held ? `: it holds ${held}` : ''}.`, {
            ...(cause ? { cause } : {}),
            metaMessages: [
                'Fund it with OUSD (send it from any wallet), or with MACH through Tempo Wallet (wallet.deposit). MACH cannot be transferred to a new address.',
            ],
            name: 'Gateway.InsufficientFundsError',
        });
        /** The paying account. */
        Object.defineProperty(this, "address", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The account's balance of each Gateway currency, in base units. */
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
/**
 * Thrown when the Gateway asks for payment on a different chain than the
 * Client's.
 *
 * @experimental
 */
export class ChainMismatchError extends BaseError {
    constructor({ chainId, expected }) {
        super(`The Gateway asks for payment on chain ${chainId}, but the Client is on chain ${expected}.`, {
            metaMessages: [
                'Create the Client on the chain the Gateway is paid on (see getCapabilities().chainId).',
            ],
            name: 'Gateway.ChainMismatchError',
        });
    }
}
/**
 * Thrown when a Client with an account pays the Gateway but `mppx` is not
 * installed.
 *
 * @experimental
 */
export class MppxNotInstalledError extends BaseError {
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
/**
 * Thrown when `kv.set` with `ifVersion` does not match the stored version.
 *
 * @experimental
 */
export class VersionConflictError extends RequestError {
    constructor(parameters) {
        super(parameters, {
            name: 'Gateway.VersionConflictError',
            shortMessage: 'Stored version does not match ifVersion.',
        });
    }
}
//# sourceMappingURL=Gateway.js.map