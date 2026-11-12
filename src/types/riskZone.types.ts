import type { RiverThresholds } from './telemetry.types';

export type MapLayer = 'FLOOD' | 'LANDSLIDE';

export type MapViewMode = MapLayer | 'SIMULATION';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type SimulationQuotaStatus =
    | 'NORMAL'
    | 'OBSERVATION'
    | 'ATTENTION'
    | 'ALERT'
    | 'MAX_ALERT';

export interface SimulationQuotaBracket {
    status: SimulationQuotaStatus;
    label: string;
    rangeText: string;
    minMeters: number;
    maxMeters: number | null;
    color: string;
}

export interface SimulationStationProfile {
    stationId: string;
    riverName: string;
    stationName: string;
    displayLabel: string;
    coordinates: [number, number];
    currentLevel: number;
    minScaleMeters: number;
    maxScaleMeters: number;
    thresholds: RiverThresholds;
    brackets: SimulationQuotaBracket[];
}

export interface BackendRiskZoneDTO {
    id: string;
    name: string;
    zoneType: MapLayer;
    riskLevel: RiskLevel;
    latitude: number;
    longitude: number;
    radius: number;
    description: string;
}

export interface RiskZone {
    id: string;
    name: string;
    zoneType: MapLayer;
    coordinates: [number, number];
    radius: number;
    level: RiskLevel;
    description: string;
}

export interface HydroWaterwaySegment {
    id: string;
    name: string;
    kind: 'river' | 'stream' | 'canal';
    channelWidthMeters: number;
    points: [number, number][];
}

export interface CityHydrologyMesh {
    citySlug: string;
    center: [number, number];
    segments: HydroWaterwaySegment[];
}

export type RiskZoneInput = Omit<RiskZone, 'id'>;

export type StreetFloodSeverity = 'WATCH' | 'WARNING' | 'CRITICAL';

export interface SimulatedStreetSegment {
    id: string;
    name: string;
    neighborhood: string | null;
    highwayType: string;
    focusPoint: [number, number];
    polylines: [number, number][][];
    distanceToRiverMeters: number;
    baseEffectiveQuotaMeters: number;
}

export interface ImpactedStreetEvaluation {
    street: SimulatedStreetSegment;
    triggerQuotaMeters: number;
    waterDepthMeters: number;
    severity: StreetFloodSeverity;
}

export interface StreetQuotaDiagnostic {
    street: SimulatedStreetSegment;
    triggerQuotaMeters: number;
    isFlooded: boolean;
    waterDepthMeters: number;
    safetyMarginMeters: number;
    severity: StreetFloodSeverity | 'SAFE';
}