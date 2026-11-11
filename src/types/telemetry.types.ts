export type RiverStatus = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'BELOW';

export type RiverTrend = 'RISING' | 'FALLING' | 'STABLE';

export type StationType = 'FLUVIOMETRICA' | 'PLUVIOMETRICA' | string;

export interface TelemetryReadingDTO {
    measuredAt: string;
    levelMeters: number | null;
    flowM3s: number | null;
    rainMm: number | null;
}

export interface StationTelemetryDTO {
    stationCode: string;
    stationName: string;
    stationType: StationType;
    riverName: string;
    latitude: number;
    longitude: number;
    currentLevelMeters: number | null;
    currentFlowM3s: number | null;
    accumulatedRain24hMm: number;
    status: string;
    thresholdWarning: number;
    thresholdAlert: number;
    thresholdCritical: number;
    lastMeasuredAt: string | null;
    history: TelemetryReadingDTO[];
}

export interface RiverData {
    id: string;
    name: string;
    capacityPercentage: number;
    currentLevel: number;
    currentFlowM3s: number | null;
    trend: RiverTrend;
    levelDeltaCm: number;
    status: RiverStatus;
    location: string;
    lastRead: string;
}

export interface TelemetryStationMarker {
    stationCode: string;
    stationName: string;
    stationType: StationType;
    riverName: string;
    coordinates: [number, number];
    currentLevelMeters: number | null;
    currentFlowM3s: number | null;
    accumulatedRain24hMm: number;
    status: RiverStatus;
    lastRead: string;
}

export interface ChartDataPoint {
    time: string;
    level: number;
}

export interface RiverThresholds {
    attention: number;
    warning: number;
    emergency: number;
}

export interface RiverHistoryData {
    riverId: string;
    riverName: string;
    thresholds: RiverThresholds;
    history: ChartDataPoint[];
}

export interface RainMeasurement {
    periodLabel: '1 H' | '6 H' | '12 H' | '24 H' | string;
    value: number;
}

export interface RainGaugeData {
    stationName: string;
    isRainingNow: boolean;
    lastUpdated: string;
    maxScale: number;
    measurements: RainMeasurement[];
}