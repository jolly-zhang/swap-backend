import type { Address } from 'abitype';
import { BaseError } from '../errors/base.js';
/**
 * Free discovery document of a Gateway.
 *
 * @experimental
 */
export type Capabilities = {
    /** Chain the Gateway accepts payments on. */
    chainId: number;
    /** Sandboxed compute. */
    compute: {
        /** Whether this Gateway offers compute. */
        available: boolean;
        /** Price per CPU core-second in currency units. */
        cpuPerSecond: number;
        /** Defaults of `compute.create`. */
        defaults: {
            /** CPU cores. */
            cpu: number;
            /** Container image. */
            image: string;
            /** Memory in MiB. */
            memory: number;
            /** Seconds the sandbox may live. */
            timeout: number;
        };
        /** Price per GPU-second in currency units, by GPU type. */
        gpusPerSecond: Record<string, number>;
        /** Price per GiB-second of memory in currency units. */
        memoryGiBPerSecond: number;
    };
    /** Payment currencies by name. */
    currencies: Record<string, Address>;
    /** Request and storage limits. */
    limits: {
        /** Maximum CPU cores per sandbox. */
        cpu: number;
        /** Maximum `compute.exec` timeout in seconds. */
        execSeconds: number;
        /** Maximum GPUs per sandbox. */
        gpuCount: number;
        /** Maximum key size in bytes. */
        keyBytes: number;
        /** Maximum page size of `list` actions. */
        listLimit: number;
        /** Maximum `maxOutputTokens` of `ai.generateText`. */
        maxOutputTokens: number;
        /** Maximum sandbox memory in MiB. */
        memory: number;
        /** Maximum object size in bytes. */
        objectBytes: number;
        /** Maximum retention or TTL in seconds. */
        retentionSeconds: number;
        /** Maximum sandbox lifetime in seconds. */
        sandboxSeconds: number;
        /** Maximum `compute.stream` timeout in seconds. */
        streamSeconds: number;
        /** Maximum serialized key-value size in bytes. */
        valueBytes: number;
    };
    /** Operations priced per token instead of per request. */
    metered: readonly string[];
    /** Supported models by operation. */
    models: {
        /** Embedding models. */
        embed: readonly string[];
        /** Text generation models. */
        generate: readonly string[];
    };
    /**
     * Price of each operation in human-readable currency units. Metered
     * operations list their minimum.
     */
    prices: Record<string, string>;
    /** Payment recipient. */
    recipient: Address;
    /**
     * Price of metered AI operations per million tokens, by model. A request
     * reserves the most it can cost and the unused part is refunded.
     */
    tokens: Record<string, {
        input: number;
        output: number;
    }>;
    /** Pricing version. */
    version: string;
};
/**
 * Fetch function, such as `globalThis.fetch` or `mppx`'s payment-aware fetch.
 *
 * @experimental
 */
export type Fetch = (input: string, init: RequestInit) => Promise<Response>;
/**
 * Connection to a Tempo Gateway: the service URL, the app namespace, and the
 * payment-aware `fetch` that pays for each request.
 *
 * @experimental
 */
export type Gateway = {
    /** App namespace sent as `Gateway-App`. Data is scoped by chain, payer, and app. */
    app: string;
    /** Fetch function used for every request. */
    fetch: Fetch;
    /** Gateway origin, without the `/v1` version path. */
    url: string;
};
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
export declare function from(options?: from.Options): Gateway;
export declare namespace from {
    type Options = {
        /**
         * App namespace. Must match `[a-z0-9][a-z0-9-]{0,62}`.
         *
         * @default 'default'
         */
        app?: string | undefined;
        /**
         * Fetch function used for every request. Pass a payment-aware fetch to pay
         * for operations.
         *
         * @default globalThis.fetch
         */
        fetch?: Fetch | undefined;
        /**
         * Gateway origin, without the `/v1` version path.
         *
         * @default 'https://gateway.tempo-dev.workers.dev'
         */
        url?: string | undefined;
    };
    type ErrorType = InvalidAppError;
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
export declare function getCapabilities(gateway: Gateway, options?: getCapabilities.Options): Promise<Capabilities>;
export declare namespace getCapabilities {
    type Options = {
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
    };
    type ErrorType = request.ErrorType;
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
export declare function request(gateway: Gateway, options: request.Options): Promise<Response>;
export declare namespace request {
    type Options = {
        /** Request body. */
        body?: BodyInit | undefined;
        /** Extra request headers. */
        headers?: Record<string, string> | undefined;
        /**
         * HTTP method.
         *
         * @default 'POST'
         */
        method?: 'GET' | 'POST' | undefined;
        /** Route under `/v1`, such as `/kv/get`. */
        path: string;
        /** Signal to abort the request. */
        signal?: AbortSignal | undefined;
    };
    type ErrorType = PaymentRequiredError | RequestError | VersionConflictError;
}
/**
 * Thrown when an app namespace does not match `[a-z0-9][a-z0-9-]{0,62}`.
 *
 * @experimental
 */
export declare class InvalidAppError extends BaseError {
    constructor({ app }: {
        app: string;
    });
}
/**
 * Thrown when a Gateway responds with a problem.
 *
 * @experimental
 */
export declare class RequestError extends BaseError {
    /** Stable problem code, such as `not_found` or `invalid_request`. */
    code: string;
    /** Problem detail. */
    detail: string;
    /** HTTP status. */
    status: number;
    /** Request URL. */
    url: string;
    constructor(parameters: RequestError.Parameters, options?: RequestError.Options);
}
export declare namespace RequestError {
    type Parameters = {
        /** Stable problem code. */
        code: string;
        /** Problem detail. */
        detail: string;
        /** HTTP status. */
        status: number;
        /** Request URL. */
        url: string;
    };
    type Options = {
        /** Error name. */
        name?: string | undefined;
        /** Short message. */
        shortMessage?: string | undefined;
    };
}
/**
 * Thrown when a Gateway asks for payment that the supplied `fetch` did not
 * provide. Pass a payment-aware `fetch` to {@link from}.
 *
 * @experimental
 */
export declare class PaymentRequiredError extends RequestError {
    constructor(parameters: RequestError.Parameters);
}
/**
 * Thrown when the Client's account holds too little of the Gateway's
 * currencies to pay for a request.
 *
 * @experimental
 */
export declare class InsufficientFundsError extends BaseError {
    /** The paying account. */
    address: Address;
    /** The account's balance of each Gateway currency, in base units. */
    balances: InsufficientFundsError.Parameters['balances'];
    constructor({ address, balances, cause }: InsufficientFundsError.Parameters);
}
export declare namespace InsufficientFundsError {
    type Parameters = {
        address: Address;
        balances: readonly {
            amount: bigint;
            currency: Address;
            symbol: string;
        }[];
        cause?: Error | undefined;
    };
}
/**
 * Thrown when the Gateway asks for payment on a different chain than the
 * Client's.
 *
 * @experimental
 */
export declare class ChainMismatchError extends BaseError {
    constructor({ chainId, expected }: {
        chainId: number;
        expected: number;
    });
}
/**
 * Thrown when a Client with an account pays the Gateway but `mppx` is not
 * installed.
 *
 * @experimental
 */
export declare class MppxNotInstalledError extends BaseError {
    constructor({ cause }?: {
        cause?: Error | undefined;
    });
}
/**
 * Thrown when `kv.set` with `ifVersion` does not match the stored version.
 *
 * @experimental
 */
export declare class VersionConflictError extends RequestError {
    constructor(parameters: RequestError.Parameters);
}
//# sourceMappingURL=Gateway.d.ts.map