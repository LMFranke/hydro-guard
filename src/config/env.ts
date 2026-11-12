function getEnvVar(key: string, fallback: string): string {
    const value = import.meta.env[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export const ENV = {
    API_BASE_URL: getEnvVar('VITE_API_URL', 'http://localhost:8080/api/v1'),
    DEFAULT_CITY_SLUG: getEnvVar('VITE_DEFAULT_CITY_SLUG', 'rodeio'),
    OPEN_METEO_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
    WINDY_EMBED_BASE_URL: 'https://embed.windy.com/embed.html',
    ARCGIS_TILE_URL:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ARCGIS_DARK_CANVAS_TILE_URL:
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
} as const;

export const APP_CONFIG = {
    STORAGE_KEYS: {
        COORDINATOR_SESSION: 'hydroguard_coordinator_session',
    },
    TELEMETRY_POLLING_INTERVAL_MS: 5 * 60 * 1000,
    DEFAULT_TIMEZONE: 'America/Sao_Paulo',
    FALLBACK_TENANT: {
        NAME: 'Rodeio',
        STATE: 'SC',
        LAT: -26.923,
        LNG: -49.366,
        EMERGENCY_PHONE: '199',
        THEME_COLOR: '#2563eb',
    },
} as const;