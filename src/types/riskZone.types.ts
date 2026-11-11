export type MapLayer = 'FLOOD' | 'LANDSLIDE';
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

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

export type RiskZoneInput = Omit<RiskZone, 'id'>;