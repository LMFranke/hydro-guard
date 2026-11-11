import type { BackendRiskZoneDTO, RiskZone, RiskZoneInput } from '../types';
import { httpClient } from './httpClient';
import { mapBackendRiskZoneToUi, mapRiskZoneInputToPayload } from './mappers';

export async function fetchCityRiskZones(slug: string): Promise<RiskZone[]> {
    const data = await httpClient.get<BackendRiskZoneDTO[]>(
        `/risk-zones/${encodeURIComponent(slug)}`
    );
    return data.map(mapBackendRiskZoneToUi);
}

export async function createRiskZone(
    token: string,
    zoneInput: RiskZoneInput
): Promise<RiskZone> {
    const payload = mapRiskZoneInputToPayload(zoneInput);
    const created = await httpClient.post<BackendRiskZoneDTO>(
        '/risk-zones',
        payload,
        { token, requiresAuth: true }
    );
    return mapBackendRiskZoneToUi(created);
}

export async function updateRiskZone(
    token: string,
    id: string,
    zoneInput: RiskZoneInput
): Promise<RiskZone> {
    const payload = mapRiskZoneInputToPayload(zoneInput);
    const updated = await httpClient.put<BackendRiskZoneDTO>(
        `/risk-zones/${encodeURIComponent(id)}`,
        payload,
        { token, requiresAuth: true }
    );
    return mapBackendRiskZoneToUi(updated);
}

export async function deleteRiskZone(token: string, id: string): Promise<void> {
    return httpClient.delete<void>(`/risk-zones/${encodeURIComponent(id)}`, {
        token,
        requiresAuth: true,
    });
}