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

export function mapWmoToWeatherType(wmoCode: number): WeatherType {
    if (wmoCode >= 95) return 'STORMY';
    if (wmoCode >= 51 && wmoCode <= 82) return 'RAINY';
    if (wmoCode >= 1 && wmoCode <= 48) return 'PARTLY_CLOUDY';
    return 'SUNNY';
}

export function evaluateForecastSeverity(rainMm: number): ForecastSeverity {
    if (rainMm >= 60) return 'DANGER';
    if (rainMm >= 35) return 'WARNING';
    if (rainMm >= 15) return 'WATCH';
    return 'NORMAL';
}

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

/**
 * Retorna a maior severidade entre os alertas ativos para estilizar o contador da Sidebar.
 */
export function getHighestAlertSeverity(
    alerts: AlertData[]
): OfficialAlertSeverity | null {
    if (alerts.length === 0) return null;
    if (alerts.some((a) => a.severity === 'CRITICAL')) return 'CRITICAL';
    if (alerts.some((a) => a.severity === 'WARNING')) return 'WARNING';
    return 'WATCH';
}

/**
 * Formata um alerta oficial em texto estruturado para divulgação no WhatsApp / Imprensa.
 */
export function formatAlertBulletinText(
    alert: AlertData,
    cityDisplayName: string
): string {
    const severityHeader: Record<OfficialAlertSeverity, string> = {
        CRITICAL: '🚨 *ALERTA CRÍTICO - DEFESA CIVIL*',
        WARNING: '⚠️ *AVISO DE ALERTA - DEFESA CIVIL*',
        WATCH: 'ℹ️ *AVISO DE ATENÇÃO - DEFESA CIVIL*',
    };

    const guidelinesList = alert.instructions
        .map((item) => `• ${item}`)
        .join('\n');

    return [
        `${severityHeader[alert.severity]} (${cityDisplayName})`,
        '',
        `*Ocorrência:* ${alert.title}`,
        `*Região Afetada:* ${alert.region}`,
        `*Emitido em:* ${alert.issuedAt}`,
        '',
        `*Descrição:* ${alert.description}`,
        '',
        '*Orientações de Segurança:*',
        guidelinesList,
        '',
        `🔗 _Monitoramento em tempo real via HydroGuard (${cityDisplayName})_`,
    ].join('\n');
}

/**
 * Gera a URL oficial de compartilhamento do WhatsApp com o comunicado codificado.
 */
export function buildWhatsAppShareUrl(
    alert: AlertData,
    cityDisplayName: string
): string {
    const text = formatAlertBulletinText(alert, cityDisplayName);
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}