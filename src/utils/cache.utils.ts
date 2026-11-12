import type {
    AlertData,
    RainGaugeData,
    RiskZone,
    RiverData,
    RiverHistoryData,
    SystemHealthState,
    TelemetryStationMarker,
} from '../types';

interface CacheEntry<T> {
    data: T;
    updatedAt: number;
    expiresAt: number;
}

export interface CachedOperationalSnapshot {
    rivers: RiverData[];
    stationMarkers: TelemetryStationMarker[];
    historyData: RiverHistoryData[];
    rainData: RainGaugeData | null;
    alerts: AlertData[];
    riskZones: RiskZone[];
    systemHealth: SystemHealthState;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = 'hg_cache_v3:';

export const CACHE_TTL = {
    TELEMETRY_MS: 5 * 60 * 1000,   // 5 min
    TENANT_MS: 15 * 60 * 1000,     // 15 min
    WEATHER_MS: 30 * 60 * 1000,    // 30 min
    CITIES_LIST_MS: 10 * 60 * 1000 // 10 min
} as const;

export function readCache<T>(key: string): {
    data: T;
    isExpired: boolean;
    updatedAt: number;
} | null {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    const now = Date.now();

    const memEntry = memoryCache.get(fullKey) as CacheEntry<T> | undefined;
    if (memEntry) {
        return {
            data: memEntry.data,
            isExpired: now > memEntry.expiresAt,
            updatedAt: memEntry.updatedAt,
        };
    }

    try {
        const raw = localStorage.getItem(fullKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (!parsed || parsed.data === undefined) return null;

        memoryCache.set(fullKey, parsed);

        return {
            data: parsed.data,
            isExpired: now > parsed.expiresAt,
            updatedAt: parsed.updatedAt,
        };
    } catch {
        return null;
    }
}

export function writeCache<T>(key: string, data: T, ttlMs: number): void {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    const now = Date.now();
    const entry: CacheEntry<T> = {
        data,
        updatedAt: now,
        expiresAt: now + ttlMs,
    };

    memoryCache.set(fullKey, entry);

    try {
        localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch {
        // ignored
    }
}

export function readOperationalCache(citySlug: string) {
    return readCache<CachedOperationalSnapshot>(`ops_${citySlug}`);
}

export function writeOperationalCache(
    citySlug: string,
    snapshot: CachedOperationalSnapshot
): void {
    writeCache(`ops_${citySlug}`, snapshot, CACHE_TTL.TELEMETRY_MS);
}

export function patchOperationalCache(
    citySlug: string,
    partial: Partial<CachedOperationalSnapshot>
): void {
    const existing = readOperationalCache(citySlug)?.data;
    if (!existing) return;
    writeOperationalCache(citySlug, { ...existing, ...partial });
}