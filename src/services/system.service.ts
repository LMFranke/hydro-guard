import type { SystemHealthDTO, SystemHealthState } from '../types';
import { httpClient } from './httpClient';

export const INITIAL_HEALTH_STATE: SystemHealthState = {
    backendStatus: 'CHECKING',
    anaApiStatus: 'CHECKING',
    anaLatencyMs: null,
    checkedAt: null,
    message: 'Verificando conectividade dos serviços...',
};

export async function fetchSystemHealth(): Promise<SystemHealthDTO> {
    return httpClient.get<SystemHealthDTO>('/system/health');
}

/**
 * Realiza uma sondagem ativa de saúde e já devolve o estado formatado para a UI,
 * tratando falhas de rede sem lançar exceções não tratadas.
 */
export async function probeSystemHealthLive(): Promise<SystemHealthState> {
    try {
        const health = await fetchSystemHealth();
        return {
            backendStatus: health.backendStatus,
            anaApiStatus: health.anaApiStatus,
            anaLatencyMs: health.anaLatencyMs,
            checkedAt: health.checkedAt,
            message: health.message,
        };
    } catch {
        return {
            backendStatus: 'OFFLINE',
            anaApiStatus: 'OFFLINE',
            anaLatencyMs: null,
            checkedAt: new Date().toISOString(),
            message: 'Servidor Back-end inacessível no momento.',
        };
    }
}

/**
 * Cruza o resultado do endpoint de health com o resultado das chamadas operacionais
 * para determinar o diagnóstico consolidado exibido na Sidebar.
 */
export function resolveSystemHealthState(
    healthResult: PromiseSettledResult<SystemHealthDTO>,
    anyBackendCallWorked: boolean,
    hasActiveRivers: boolean
): SystemHealthState {
    if (healthResult.status === 'fulfilled') {
        const h = healthResult.value;
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
    };
}