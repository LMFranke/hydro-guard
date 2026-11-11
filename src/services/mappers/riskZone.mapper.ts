import type { BackendRiskZoneDTO, RiskZone, RiskZoneInput } from '../../types';

export function mapBackendRiskZoneToUi(dto: BackendRiskZoneDTO): RiskZone {
    return {
        id: dto.id,
        name: dto.name,
        zoneType: dto.zoneType,
        coordinates: [dto.latitude, dto.longitude],
        radius: dto.radius,
        level: dto.riskLevel,
        description: dto.description,
    };
}

export function mapRiskZoneInputToPayload(zone: RiskZoneInput) {
    return {
        name: zone.name.trim(),
        zoneType: zone.zoneType,
        riskLevel: zone.level,
        latitude: zone.coordinates[0],
        longitude: zone.coordinates[1],
        radius: zone.radius,
        description: zone.description.trim(),
    };
}