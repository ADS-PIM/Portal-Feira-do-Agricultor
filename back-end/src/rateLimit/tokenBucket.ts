export interface BucketPolicy {
    capacity: number;
    refillIntervalMs: number;
}

export interface BucketState {
    tokens: number;
    updatedAt: number;
}

export interface BucketResult extends BucketState {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
    resetAfterSeconds: number;
}

export interface TokenBucketStore {
    consume(key: string, policy: BucketPolicy): Promise<BucketResult>;
}

// The interval refills a completely empty bucket. It is not a fixed window.
export function consumeToken(state: BucketState | undefined, policy: BucketPolicy, now: number): BucketResult {
    if (!Number.isSafeInteger(policy.capacity) || policy.capacity < 1 ||
        !Number.isSafeInteger(policy.refillIntervalMs) || policy.refillIntervalMs < 1) {
        throw new Error('Invalid token bucket policy');
    }

    const updatedAt = Math.max(now, state?.updatedAt ?? now);
    const tokensPerMs = policy.capacity / policy.refillIntervalMs;
    const available = Math.min(policy.capacity,
        (state?.tokens ?? policy.capacity) + (updatedAt - (state?.updatedAt ?? now)) * tokensPerMs);
    const allowed = available >= 1;
    const tokens = allowed ? available - 1 : available;

    return {
        tokens,
        updatedAt,
        allowed,
        remaining: Math.floor(tokens),
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((1 - tokens) / tokensPerMs / 1000)),
        resetAfterSeconds: Math.ceil((policy.capacity - tokens) / tokensPerMs / 1000),
    };
}

// For isolated tests and single-process development only. Production uses MySQL.
export class MemoryTokenBucketStore implements TokenBucketStore {
    private buckets = new Map<string, BucketState & { expiresAt: number }>();
    private nextCleanupAt = 0;

    constructor(private now = Date.now, private maxBuckets = 10_000) {}

    async consume(key: string, policy: BucketPolicy): Promise<BucketResult> {
        const now = this.now();
        if (now >= this.nextCleanupAt || this.buckets.size >= this.maxBuckets) {
            for (const [key, bucket] of this.buckets) {
                if (bucket.expiresAt <= now) this.buckets.delete(key);
            }
            this.nextCleanupAt = now + 60_000;
        }
        if (!this.buckets.has(key) && this.buckets.size >= this.maxBuckets) {
            throw new Error('Rate limit store capacity reached');
        }
        const result = consumeToken(this.buckets.get(key), policy, now);
        this.buckets.set(key, { ...result, expiresAt: result.updatedAt + policy.refillIntervalMs });
        return result;
    }
}
