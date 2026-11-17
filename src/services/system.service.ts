import type { SystemHealthDTO, SystemHealthState } from '../types';
import { httpClient } from './httpClient';

export const INITIAL_HEALTH_STATE: SystemHealthState = {
    backendStatus: 'CHECKING',
    anaApiStatus: 'CHECKING',
    anaLatencyMs: null,
    checkedAt: null,
    message: 'Verificando conectividade dos serviços...',
    simulatedOutage: false,
};

export async function fetchSystemHealth(): Promise<SystemHealthDTO> {
    return httpClient.get<SystemHealthDTO>('/system/health');
}

export async function setSimulatedAnaOutage(
    token: string,
    active: boolean
): Promise<SystemHealthDTO> {
    return httpClient.post<SystemHealthDTO>(
        `/system/ana-outage?active=${active}`,
        undefined,
        { token, requiresAuth: true }
    );
}

export async function probeSystemHealthLive(): Promise<SystemHealthState> {
    try {
        const health = await fetchSystemHealth();
        return {
            backendStatus: health.backendStatus,
            anaApiStatus: health.anaApiStatus,
            anaLatencyMs: health.anaLatencyMs,
            checkedAt: health.checkedAt,
            message: health.message,
            simulatedOutage: Boolean(health.simulatedOutage),
        };
    } catch {
        return {
            backendStatus: 'OFFLINE',
            anaApiStatus: 'OFFLINE',
            anaLatencyMs: null,
            checkedAt: new Date().toISOString(),
            message: 'Servidor Back-end inacessível no momento.',
            simulatedOutage: false,
        };
    }
}

export function resolveSystemHealthState(
    healthResult: PromiseSettledResult<SystemHealthDTO>,
    anyBackendCallWorked: boolean,
    hasActiveRivers: boolean
): SystemHealthState {
    if (healthResult.status === 'fulfilled') {
        const h = healthResult.value;
        if (h.simulatedOutage) {
            return {
                backendStatus: h.backendStatus,
                anaApiStatus: 'OFFLINE',
                anaLatencyMs: null,
                checkedAt: h.checkedAt,
                message: h.message,
                simulatedOutage: true,
            };
        }

        const effectiveAnaStatus =
            h.anaApiStatus === 'ONLINE' && !hasActiveRivers
                ? 'INSTABLE'
                : h.anaApiStatus;

        return {
            backendStatus: h.backendStatus,
            anaApiStatus: effectiveAnaStatus,
            anaLatencyMs: h.anaLatencyMs,
            checkedAt: h.checkedAt,
            message:
                effectiveAnaStatus === 'INSTABLE' && !hasActiveRivers
                    ? 'API da ANA conectada, mas sem leituras recentes nas estações.'
                    : h.message,
            simulatedOutage: false,
        };
    }

    return {
        backendStatus: anyBackendCallWorked ? 'ONLINE' : 'OFFLINE',
        anaApiStatus: hasActiveRivers ? 'ONLINE' : 'OFFLINE',
        anaLatencyMs: null,
        checkedAt: new Date().toISOString(),
        message: anyBackendCallWorked
            ? 'Endpoint de diagnóstico indisponível.'
            : 'Servidor Back-end inacessível.',
        simulatedOutage: false,
    };
}