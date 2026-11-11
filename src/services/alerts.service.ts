import type { AlertData, BackendAlertDTO, CreateAlertInput } from '../types';
import { httpClient } from './httpClient';
import { mapBackendAlertToUi, mapCreateAlertInputToPayload } from './mappers';

export async function fetchActiveAlerts(slug: string): Promise<AlertData[]> {
    const data = await httpClient.get<BackendAlertDTO[]>(
        `/alerts/${encodeURIComponent(slug)}`
    );
    return data.map(mapBackendAlertToUi);
}

export async function createOfficialAlert(
    token: string,
    alertInput: CreateAlertInput
): Promise<AlertData> {
    const payload = mapCreateAlertInputToPayload(alertInput);
    const created = await httpClient.post<BackendAlertDTO>('/alerts', payload, {
        token,
        requiresAuth: true,
    });
    return mapBackendAlertToUi(created);
}

export async function deactivateOfficialAlert(
    token: string,
    alertId: string
): Promise<void> {
    return httpClient.patch<void>(
        `/alerts/${encodeURIComponent(alertId)}/deactivate`,
        undefined,
        { token, requiresAuth: true }
    );
}