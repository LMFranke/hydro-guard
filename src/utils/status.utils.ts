import type {
    AlertData,
    CityStatusSummary,
    ForecastSeverity,
    MapLayer,
    OfficialAlertSeverity,
    RiskLevel,
    RiverData,
    RiverStatus,
    WeatherType,
} from '../types';

export const RIVER_STATUS_LABELS: Record<RiverStatus, string> = {
    CRITICAL: 'CRÍTICO',
    WARNING: 'ATENÇÃO',
    NORMAL: 'NORMAL',
    BELOW: 'ABAIXO',
};

export const OFFICIAL_ALERT_SEVERITY_LABELS: Record<OfficialAlertSeverity, string> = {
    CRITICAL: 'CRÍTICO',
    WARNING: 'ALERTA',
    WATCH: 'ATENÇÃO',
};

export const FORECAST_SEVERITY_LABELS: Record<ForecastSeverity, string> = {
    NORMAL: 'Sem Risco',
    WATCH: 'Atenção',
    WARNING: 'Alerta',
    DANGER: 'Emergência',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
    HIGH: 'Alto',
    MEDIUM: 'Médio',
    LOW: 'Baixo',
};

/**
 * Calcula o status global do município com base nos rios monitorados e alertas ativos.
 */
export function evaluateCityGlobalStatus(
    rivers: RiverData[],
    alerts: AlertData[]
): CityStatusSummary {
    const hasCritical =
        rivers.some((r) => r.status === 'CRITICAL') ||
        alerts.some((a) => a.severity === 'CRITICAL');

    if (hasCritical) {
        return { status: 'CRITICAL', label: 'Crítico', badgeVariant: 'critical' };
    }

    const hasWarning =
        rivers.some((r) => r.status === 'WARNING') ||
        alerts.some((a) => a.severity === 'WARNING');

    if (hasWarning) {
        return { status: 'WARNING', label: 'Alerta', badgeVariant: 'warning' };
    }

    return { status: 'NORMAL', label: 'Normal', badgeVariant: 'normal' };
}

/**
 * Converte o status bruto vindo do backend de telemetria para o tipo estrito RiverStatus.
 */
export function mapBackendStationStatus(rawStatus: string): RiverStatus {
    switch (rawStatus.toUpperCase()) {
        case 'CRITICAL':
            return 'CRITICAL';
        case 'ALERT':
        case 'WARNING':
            return 'WARNING';
        case 'BELOW':
            return 'BELOW';
        default:
            return 'NORMAL';
    }
}

/**
 * Converte códigos meteorológicos WMO (Open-Meteo) em tipos visuais do sistema.
 */
export function mapWmoToWeatherType(wmoCode: number): WeatherType {
    if (wmoCode >= 95) return 'STORMY';
    if (wmoCode >= 51 && wmoCode <= 82) return 'RAINY';
    if (wmoCode >= 1 && wmoCode <= 48) return 'PARTLY_CLOUDY';
    return 'SUNNY';
}

/**
 * Avalia a severidade diária da previsão com base no volume de chuva esperado (mm).
 */
export function evaluateForecastSeverity(rainMm: number): ForecastSeverity {
    if (rainMm >= 60) return 'DANGER';
    if (rainMm >= 35) return 'WARNING';
    if (rainMm >= 15) return 'WATCH';
    return 'NORMAL';
}

/**
 * Retorna a cor hexadecimal do polígono/círculo no mapa Leaflet conforme camada e risco.
 */
export function getRiskZoneColor(level: RiskLevel, layer: MapLayer): string {
    const palette: Record<MapLayer, Record<RiskLevel, string>> = {
        FLOOD: {
            HIGH: '#3b82f6',
            MEDIUM: '#60a5fa',
            LOW: '#93c5fd',
        },
        LANDSLIDE: {
            HIGH: '#ef4444',
            MEDIUM: '#f97316',
            LOW: '#fcd34d',
        },
    };

    return palette[layer][level];
}