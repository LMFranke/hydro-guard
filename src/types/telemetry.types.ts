export type RiverStatus = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'BELOW';

export type CityOperationalStatus =
    | RiverStatus
    | 'ALERT'
    | 'UNAVAILABLE'
    | 'STALE';

export type WaterTrend = 'RISING' | 'FALLING' | 'STABLE';

export interface RiverThresholds {
    attention: number;
    warning: number;
    emergency: number;
}

export interface RiverData {
    id: string;
    name: string;
    location: string;
    currentLevel: number;
    flowRate: number | null;
    capacityPercent: number;
    status: RiverStatus;
    trend: WaterTrend;
    trendDeltaCm: number;
    lastUpdate: string;
    source: string;
    isStale: boolean;
    readingAgeMinutes: number | null;
}

export interface RiverHistoryPoint {
    time: string;
    level: number;
}

export interface RiverHistoryData {
    riverId: string;
    riverName: string;
    stationName: string;
    source: string;
    lastUpdate: string;
    isStale: boolean;
    thresholds: RiverThresholds;
    history: RiverHistoryPoint[];
}

export interface RainPeriodMeasurement {
    periodLabel: string;
    value: number;
}

export interface RainGaugeData {
    stationId: string;
    stationName: string;
    isRainingNow: boolean;
    maxScale: number;
    lastUpdated: string;
    source: string;
    isStale: boolean;
    measurements: RainPeriodMeasurement[];
}

export interface TelemetryStationMarker {
    stationCode: string;
    stationName: string;
    stationType: 'Fluviometrica' | 'Pluviometrica';
    riverName: string;
    coordinates: [number, number];
    currentLevelMeters: number | null;
    currentFlowM3s: number | null;
    accumulatedRain24hMm: number;
    status: RiverStatus;
    lastRead: string;
    source: string;
    isStale: boolean;
}

export interface CityStatusSummary {
    status: CityOperationalStatus;
    label: string;
    badgeVariant:
        | 'normal'
        | 'watch'
        | 'warning'
        | 'critical'
        | 'neutral';
}

export interface TelemetryReadingDTO {
    measuredAt: string;
    levelMeters: number | null;
    flowM3s: number | null;
    rainMm: number | null;
}

export interface StationTelemetryDTO {
    stationCode: string;
    stationName: string;
    stationType: 'Fluviometrica' | 'Pluviometrica';
    riverName: string;
    latitude: number | null;
    longitude: number | null;
    currentLevelMeters: number | null;
    currentFlowM3s: number | null;
    accumulatedRain24hMm: number | null;
    status: string;
    thresholdWarning: number;
    thresholdAlert: number;
    thresholdCritical: number;
    lastMeasuredAt: string | null;
    history: TelemetryReadingDTO[];
}