/**
 * Expiring Cache
 *
 * @Author Marco
 * @Since 2023-09-07
 * @example
 * ```
 * const cache = new ExpiringCache<string, object>(60);
 * cache.set("key", {}, 10);
 * cache.ttl("key", 10);
 * const value = cache.get("key");
 *
 * cache.delete("key");
 * cache.clear();
 * cache.dispose();
 * ```
 */
export class ExpiringCache<K, V> {
    private cache: Map<K, { value: V; expires: number }>;
    private readonly cleanupInterval: number;

    constructor(cleanupIntervalSeconds = 60) {
        this.cache = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalSeconds * 1000);
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return;
        if (entry.expires > Date.now()) return entry.value;
        this.cache.delete(key);
    }

    set(key: K, value: V, ttl: number): void {
        const expires = Date.now() + ttl * 1000;
        this.cache.set(key, { value, expires });
    }

    ttl(key: K, ttl: number): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        entry.expires = Date.now() + ttl * 1000;
        return true;
    }

    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    dispose(): void {
        clearInterval(this.cleanupInterval);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expires < now) {
                this.cache.delete(key);
            }
        }
    }
}
