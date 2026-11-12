import type {
    AlertData,
    CityStatusSummary,
    ForecastSeverity,
    MapLayer,
    OfficialAlertSeverity,
    RiskLevel,
    RiverData,
    RiverHistoryData,
    RiverStatus,
    RiverThresholds,
    SimulationQuotaBracket,
    SimulationStationProfile,
    TelemetryStationMarker,
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

/**
 * Constrói as 5 faixas de cota da Defesa Civil garantindo que o nível normal de operação
 * da estação (mesmo em barragens/PCHs com níveis > 15m) fique na faixa de Normalidade.
 */
export function buildSimulationQuotaBrackets(
    thresholds: RiverThresholds,
    currentLevel: number,
    minScaleMeters = 0
): SimulationQuotaBracket[] {
    const attention = Number(thresholds.attention.toFixed(2));
    const warning = Number(thresholds.warning.toFixed(2));
    const emergency = Number(thresholds.emergency.toFixed(2));

    // Se o nível atual for menor que a cota de atenção, a faixa de Observação deve começar
    // acima do nível normal atual, evitando classificar o nível normal como "Observação"
    const defaultObservation = attention * 0.8;
    const observationRaw =
        currentLevel < attention && currentLevel >= defaultObservation
            ? currentLevel + (attention - currentLevel) * 0.45
            : Math.max(minScaleMeters + 0.5, defaultObservation);

    const observation = Number(observationRaw.toFixed(2));
    const fmt = (val: number) =>
        val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

    return [
        {
            status: 'NORMAL',
            label: 'Normalidade',
            rangeText: `de ${fmt(minScaleMeters)}m a ${fmt(observation)}m`,
            minMeters: minScaleMeters,
            maxMeters: observation,
            color: '#10b981',
        },
        {
            status: 'OBSERVATION',
            label: 'Observação',
            rangeText: `de ${fmt(observation)}m a ${fmt(attention)}m`,
            minMeters: observation,
            maxMeters: attention,
            color: '#eab308',
        },
        {
            status: 'ATTENTION',
            label: 'Atenção',
            rangeText: `de ${fmt(attention)}m a ${fmt(warning)}m`,
            minMeters: attention,
            maxMeters: warning,
            color: '#f97316',
        },
        {
            status: 'ALERT',
            label: 'Alerta',
            rangeText: `de ${fmt(warning)}m a ${fmt(emergency)}m`,
            minMeters: warning,
            maxMeters: emergency,
            color: '#ef4444',
        },
        {
            status: 'MAX_ALERT',
            label: 'Alerta Máximo',
            rangeText: `acima de ${fmt(emergency)}m`,
            minMeters: emergency,
            maxMeters: null,
            color: '#9333ea',
        },
    ];
}

/**
 * Gera a lista de perfis de simulação para todas as estações fluviométricas da cidade,
 * calculando dinamicamente os limites mínimo/máximo do slider e as cotas de cada estação.
 */
function normalizeTextSimple(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function calculateDistanceKmBetween(
    coordA: [number, number],
    coordB: [number, number]
): number {
    const R = 6371.0;
    const dLat = ((coordB[0] - coordA[0]) * Math.PI) / 180;
    const dLon = ((coordB[1] - coordA[1]) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((coordA[0] * Math.PI) / 180) *
        Math.cos((coordB[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Gera os perfis de simulação mantendo APENAS as estações localizadas dentro
 * do município do contexto atual (sem o raio regional de 30 km).
 */
export function buildSimulationStationProfiles(
    rivers: RiverData[],
    historyData: RiverHistoryData[],
    stationMarkers: TelemetryStationMarker[],
    cityCenter: [number, number],
    cityName: string
): SimulationStationProfile[] {
    const normCity = normalizeTextSimple(cityName.split('-')[0] ?? cityName);
    const MAX_LOCAL_CITY_RADIUS_KM = 9.0;

    const markerMap = new Map<string, TelemetryStationMarker>();
    for (const m of stationMarkers) {
        markerMap.set(m.stationCode, m);
    }

    const localRivers = rivers.filter((river) => {
        const normLocation = normalizeTextSimple(river.location);

        if (normCity.length >= 3 && normLocation.includes(normCity)) {
            return true;
        }

        const parentheticalMatch = normLocation.match(/\(([^)]+)\)$/);
        if (parentheticalMatch && !parentheticalMatch[1].includes(normCity)) {
            return false;
        }

        const marker = markerMap.get(river.id);
        if (!marker) return false;

        const distanceKm = calculateDistanceKmBetween(
            cityCenter,
            marker.coordinates
        );
        return distanceKm <= MAX_LOCAL_CITY_RADIUS_KM;
    });

    if (localRivers.length === 0) {
        const fallbackThresholds: RiverThresholds = {
            attention: 4.0,
            warning: 6.0,
            emergency: 8.0,
        };
        const primaryRiverName = rivers[0]?.name ?? `Rio Principal - ${cityName}`;

        return [
            {
                stationId: `local-${normCity.toLowerCase()}`,
                riverName: primaryRiverName,
                stationName: `Sede Municipal de ${cityName}`,
                displayLabel: `${primaryRiverName} (${cityName})`,
                coordinates: cityCenter,
                currentLevel: 2.2,
                minScaleMeters: 0,
                maxScaleMeters: 12,
                thresholds: fallbackThresholds,
                brackets: buildSimulationQuotaBrackets(fallbackThresholds, 2.2, 0),
            },
        ];
    }

    const sortedLocalRivers = [...localRivers].sort((a, b) => {
        const aHasCityName = normalizeTextSimple(a.location).includes(normCity);
        const bHasCityName = normalizeTextSimple(b.location).includes(normCity);
        if (aHasCityName !== bHasCityName) return aHasCityName ? -1 : 1;

        const aIsBarramento =
            a.location.toUpperCase().includes('BARRAMENTO') || a.currentLevel > 15;
        const bIsBarramento =
            b.location.toUpperCase().includes('BARRAMENTO') || b.currentLevel > 15;
        if (aIsBarramento !== bIsBarramento) return aIsBarramento ? 1 : -1;

        return 0;
    });

    return sortedLocalRivers.map((river) => {
        const matchedHistory = historyData.find((h) => h.riverId === river.id);
        const marker = markerMap.get(river.id);
        const currentLevel = Number(river.currentLevel.toFixed(2));

        let thresholds: RiverThresholds = matchedHistory?.thresholds ?? {
            attention: Number((currentLevel + 1.5).toFixed(2)),
            warning: Number((currentLevel + 2.5).toFixed(2)),
            emergency: Number((currentLevel + 3.5).toFixed(2)),
        };

        if (river.status === 'NORMAL' && currentLevel >= thresholds.attention) {
            thresholds = {
                attention: Number((currentLevel + 1.5).toFixed(2)),
                warning: Number((currentLevel + 2.5).toFixed(2)),
                emergency: Number((currentLevel + 3.5).toFixed(2)),
            };
        }

        const isHighElevationStation =
            currentLevel > 14 || thresholds.attention > 14;
        const minScaleMeters = isHighElevationStation
            ? Math.max(
                0,
                Math.floor(Math.min(currentLevel, thresholds.attention) - 4)
            )
            : 0;

        const highestReference = Math.max(thresholds.emergency, currentLevel);
        const maxScaleMeters = isHighElevationStation
            ? Math.ceil(highestReference + 4)
            : Math.max(8, Math.ceil(highestReference * 1.3));

        const brackets = buildSimulationQuotaBrackets(
            thresholds,
            currentLevel,
            minScaleMeters
        );

        const stationCoords = marker?.coordinates ?? cityCenter;
        const distFromCenter = calculateDistanceKmBetween(
            cityCenter,
            stationCoords
        );

        return {
            stationId: river.id,
            riverName: river.name,
            stationName: river.location,
            displayLabel: `${river.name} (${river.location})`,
            coordinates:
                distFromCenter <= MAX_LOCAL_CITY_RADIUS_KM ? stationCoords : cityCenter,
            currentLevel,
            minScaleMeters,
            maxScaleMeters,
            thresholds,
            brackets,
        };
    });
}

/**
 * Avalia em qual faixa de cota um determinado nível (em metros) se enquadra.
 */
export function evaluateSimulationQuota(
    levelMeters: number,
    brackets: SimulationQuotaBracket[]
): SimulationQuotaBracket {
    for (let i = brackets.length - 1; i >= 0; i--) {
        if (levelMeters >= brackets[i].minMeters) {
            return brackets[i];
        }
    }
    return brackets[0];
}