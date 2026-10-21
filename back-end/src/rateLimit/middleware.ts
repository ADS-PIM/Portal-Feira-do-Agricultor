import { createHash } from 'node:crypto';
import type { Express, Request, RequestHandler } from 'express';
import ipaddr from 'ipaddr.js';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../../authMiddleware';
import { connection } from '../util/connection';
import { MySQLTokenBucketStore } from './mysqlTokenBucketStore';
import { MemoryTokenBucketStore, type BucketPolicy, type TokenBucketStore } from './tokenBucket';

export const RATE_LIMIT_DEFAULTS = {
    LOGIN: 5,
    PUBLIC: 300,
    AUTHENTICATED: 300,
    PASSWORD: 5,
    PASSWORD_RECOVERY: 5,
    REGISTRATION: 5,
    MESSAGE: 10,
    SESSION: 30,
    ANONYMOUS: 60,
} as const;

type PolicyName = keyof typeof RATE_LIMIT_DEFAULTS;
type Policies = Record<PolicyName, BucketPolicy>;
const mysqlStore = new MySQLTokenBucketStore(connection);

export function readPolicies(env: NodeJS.ProcessEnv = process.env): Policies {
    return Object.fromEntries(Object.entries(RATE_LIMIT_DEFAULTS).map(([name, capacity]) => {
        const value = env[`RATE_LIMIT_${name}_CAPACITY`];
        const configured = value === undefined || value === '' ? capacity : Number(value);
        if (!Number.isSafeInteger(configured) || configured < 1) {
            throw new Error(`RATE_LIMIT_${name}_CAPACITY must be a positive integer`);
        }
        return [name, { capacity: configured, refillIntervalMs: 15 * 60 * 1000 }];
    })) as Policies;
}

export function configureRateLimiting(app: Express, env: NodeJS.ProcessEnv = process.env): void {
    const proxy = env.TRUST_PROXY?.trim();
    if (proxy === 'true') throw new Error('TRUST_PROXY must specify trusted proxy hops or addresses, not true');
    app.set('trust proxy', !proxy ? (env.VERCEL === '1' ? 1 : false)
        : proxy === 'false' ? false : /^\d+$/.test(proxy) ? Number(proxy) : proxy.split(',').map(value => value.trim()));
    const store = env.RATE_LIMIT_STORE || 'mysql';
    if (store !== 'mysql' && store !== 'memory') throw new Error('RATE_LIMIT_STORE must be mysql or memory');
    if (store === 'memory' && (env.NODE_ENV === 'production' || env.VERCEL === '1')) {
        throw new Error('Production rate limiting requires the shared MySQL store');
    }
    app.locals.rateLimitPolicies = readPolicies(env);
    app.locals.rateLimitStore = store === 'memory' ? new MemoryTokenBucketStore() : mysqlStore;
}

export function normalizeIp(value: string): string {
    try {
        const address = ipaddr.process(value);
        if (address.kind() === 'ipv4') return address.toString();
        // Group IPv6 privacy addresses by /64 so rotating interface IDs cannot reset a quota.
        const bytes = address.toByteArray();
        bytes.fill(0, 8);
        return `${ipaddr.fromByteArray(bytes).toString()}/64`;
    } catch {
        return 'unknown';
    }
}

const ipKey = (req: Request) => normalizeIp(req.ip || req.socket.remoteAddress || 'unknown');
const adminKey = (req: AuthRequest) => req.admin?.adminId;
const emailKey = (req: Request) => {
    const email = req.body?.email;
    return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
};

const sessionKey = (req: Request): string => {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.refreshToken;
    if (token && process.env.JWT_REFRESH_SECRET) {
        try {
            const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            if (typeof payload !== 'string' && typeof payload.adminId === 'string' && payload.adminId) {
                return `user:${payload.adminId}`;
            }
        } catch { /* Invalid credentials use the IP bucket. Never trust a decoded, unverified JWT. */ }
    }
    return `ip:${ipKey(req)}`;
};

export function rateLimit(name: PolicyName, scope: string, identify: (req: AuthRequest) => string | undefined): RequestHandler {
    return async (req, res, next) => {
        if (req.method === 'OPTIONS') { next(); return; }
        const identity = identify(req);
        if (identity === undefined) { next(); return; }
        const policy = (req.app.locals.rateLimitPolicies as Policies | undefined)?.[name] ?? readPolicies({})[name];
        const store = (req.app.locals.rateLimitStore as TokenBucketStore | undefined) ?? mysqlStore;
        // Identifiers (including email addresses) are never stored as plaintext.
        // Policy versioning avoids interpreting old balances with a new capacity.
        const key = createHash('sha256').update(JSON.stringify(['v1', scope, policy, identity])).digest('hex');
        try {
            const result = await store.consume(key, policy);
            res.setHeader('RateLimit-Limit', policy.capacity);
            res.setHeader('RateLimit-Remaining', result.remaining);
            res.setHeader('RateLimit-Reset', result.resetAfterSeconds);
            if (!result.allowed) {
                res.setHeader('Retry-After', result.retryAfterSeconds);
                res.setHeader('Cache-Control', 'no-store');
                res.status(429).json({
                    error: 'Muitas requisições. Aguarde antes de tentar novamente.',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: result.retryAfterSeconds,
                });
                return;
            }
        } catch {
            // A database outage must not silently disable brute-force protection.
            res.setHeader('Retry-After', 5);
            res.setHeader('Cache-Control', 'no-store');
            res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente em instantes.', code: 'RATE_LIMIT_UNAVAILABLE' });
            return;
        }
        next();
    };
}

export const loginRateLimit = [rateLimit('LOGIN', 'login:ip', ipKey), rateLimit('LOGIN', 'login:email', emailKey)];
export const passwordRecoveryRateLimit = [
    rateLimit('PASSWORD_RECOVERY', 'password-recovery:ip', ipKey),
    rateLimit('PASSWORD_RECOVERY', 'password-recovery:email', emailKey),
];
export const passwordResetRateLimit = rateLimit('PASSWORD_RECOVERY', 'password-reset:ip', ipKey);
export const registrationRateLimit = [rateLimit('REGISTRATION', 'registration:ip', ipKey), rateLimit('REGISTRATION', 'registration:email', emailKey)];
export const publicReadRateLimit = rateLimit('PUBLIC', 'public:ip', ipKey);
export const authenticatedRateLimit = rateLimit('AUTHENTICATED', 'authenticated:user', adminKey);
export const anonymousRateLimit = rateLimit('ANONYMOUS', 'anonymous:ip', ipKey);
export const messageRateLimit = rateLimit('MESSAGE', 'message:ip', ipKey);
export const sessionRateLimit = rateLimit('SESSION', 'session', sessionKey);
export const passwordRateLimit = rateLimit('PASSWORD', 'password:user', req =>
    req.body && Object.hasOwn(req.body, 'password') ? adminKey(req) : undefined);
