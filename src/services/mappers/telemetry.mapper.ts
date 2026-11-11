import type {
    RainGaugeData,
    RiverData,
    RiverHistoryData,
    RiverStatus,
    RiverTrend,
    StationTelemetryDTO,
    TelemetryReadingDTO,
    TelemetryStationMarker,
} from '../../types';
import {
    extractHourMinute,
    mapBackendStationStatus,
    normalizeAnaTimestamp,
} from '../../utils';

const STATUS_PRIORITY_WEIGHT: Record<RiverStatus, number> = {
    CRITICAL: 4,
    WARNING: 3,
    NORMAL: 2,
    BELOW: 1,
};

function sortStationsByPriority(
    a: StationTelemetryDTO,
    b: StationTelemetryDTO
): number {
    const statusA = mapBackendStationStatus(a.status);
    const statusB = mapBackendStationStatus(b.status);

    const weightDiff =
        STATUS_PRIORITY_WEIGHT[statusB] - STATUS_PRIORITY_WEIGHT[statusA];
    if (weightDiff !== 0) return weightDiff;

    const ratioA =
        a.thresholdCritical > 0 && a.currentLevelMeters !== null
            ? a.currentLevelMeters / a.thresholdCritical
            : 0;
    const ratioB =
        b.thresholdCritical > 0 && b.currentLevelMeters !== null
            ? b.currentLevelMeters / b.thresholdCritical
            : 0;

    if (ratioB !== ratioA) return ratioB - ratioA;

    return a.stationName.localeCompare(b.stationName, 'pt-BR');
}

function resolveRiverDisplayName(station: StationTelemetryDTO): string {
    return station.riverName &&
    station.riverName.trim() !== '' &&
    station.riverName !== 'N/A'
        ? station.riverName
        : station.stationName;
}

/**
 * Calcula a tendência hidrológica (Subindo, Recuando ou Estável) e a variação
 * em centímetros (cm) comparando a leitura atual com a leitura anterior válida.
 */
function computeRiverTrend(
    currentLevel: number,
    history: TelemetryReadingDTO[] | undefined
): { trend: RiverTrend; levelDeltaCm: number } {
    if (!Array.isArray(history) || history.length < 2) {
        return { trend: 'STABLE', levelDeltaCm: 0 };
    }

    const validReadings = history.filter(
        (item): item is TelemetryReadingDTO & { levelMeters: number } =>
            item.levelMeters !== null
    );

    if (validReadings.length < 2) {
        return { trend: 'STABLE', levelDeltaCm: 0 };
    }

    const previousReading = validReadings[validReadings.length - 2].levelMeters;
    const deltaCm = Math.round((currentLevel - previousReading) * 100);

    if (deltaCm > 1) {
        return { trend: 'RISING', levelDeltaCm: deltaCm };
    }
    if (deltaCm < -1) {
        return { trend: 'FALLING', levelDeltaCm: deltaCm };
    }
    return { trend: 'STABLE', levelDeltaCm: deltaCm };
}

export function mapStationsToRiverCards(
    stations: StationTelemetryDTO[]
): RiverData[] {
    const activeFluviometric = stations
        .filter(
            (s) =>
                s.stationType.toLowerCase() === 'fluviometrica' &&
                s.currentLevelMeters !== null
        )
        .sort(sortStationsByPriority);

    return activeFluviometric.map((station) => {
        const currentLevel = station.currentLevelMeters ?? 0;
        const capacityPercentage =
            station.thresholdCritical > 0
                ? Math.min(
                    Math.round((currentLevel / station.thresholdCritical) * 10000) /
                    100,
                    100
                )
                : 0;

        const { trend, levelDeltaCm } = computeRiverTrend(
            currentLevel,
            station.history
        );

        return {
            id: station.stationCode,
            name: resolveRiverDisplayName(station),
            capacityPercentage,
            currentLevel,
            currentFlowM3s: station.currentFlowM3s,
            trend,
            levelDeltaCm,
            status: mapBackendStationStatus(station.status),
            location: station.stationName,
            lastRead: normalizeAnaTimestamp(station.lastMeasuredAt),
        };
    });
}

export function mapStationsToMapMarkers(
    stations: StationTelemetryDTO[]
): TelemetryStationMarker[] {
    return stations
        .filter(
            (s) =>
                typeof s.latitude === 'number' &&
                typeof s.longitude === 'number' &&
                !Number.isNaN(s.latitude) &&
                !Number.isNaN(s.longitude) &&
                (s.latitude !== 0 || s.longitude !== 0)
        )
        .sort(sortStationsByPriority)
        .map((station) => ({
            stationCode: station.stationCode,
            stationName: station.stationName,
            stationType: station.stationType,
            riverName: resolveRiverDisplayName(station),
            coordinates: [station.latitude, station.longitude],
            currentLevelMeters: station.currentLevelMeters,
            currentFlowM3s: station.currentFlowM3s,
            accumulatedRain24hMm: Number(
                (station.accumulatedRain24hMm ?? 0).toFixed(1)
            ),
            status: mapBackendStationStatus(station.status),
            lastRead: normalizeAnaTimestamp(station.lastMeasuredAt),
        }));
}

export function mapStationsToRiverHistory(
    stations: StationTelemetryDTO[]
): RiverHistoryData[] {
    return stations
        .filter(
            (s) =>
                Array.isArray(s.history) && s.history.some((h) => h.levelMeters !== null)
        )
        .sort(sortStationsByPriority)
        .map((station) => ({
            riverId: station.stationCode,
            riverName: `${resolveRiverDisplayName(station)} (${station.stationName})`,
            thresholds: {
                attention: station.thresholdWarning,
                warning: station.thresholdAlert,
                emergency: station.thresholdCritical,
            },
            history: station.history
                .filter((h) => h.levelMeters !== null)
                .map((h) => ({
                    time: extractHourMinute(h.measuredAt),
                    level: h.levelMeters ?? 0,
                })),
        }));
}

export function mapStationsToRainData(
    stations: StationTelemetryDTO[]
): RainGaugeData {
    const stationWithRain =
        stations.find((s) => Array.isArray(s.history) && s.history.length > 0) ??
        stations[0];

    if (!stationWithRain) {
        return {
            stationName: 'Indisponível',
            isRainingNow: false,
            lastUpdated: '--:--',
            maxScale: 50,
            measurements: [
                { periodLabel: '1 H', value: 0 },
                { periodLabel: '6 H', value: 0 },
                { periodLabel: '12 H', value: 0 },
                { periodLabel: '24 H', value: 0 },
            ],
        };
    }

    const history = stationWithRain.history;
    const sumLastHours = (hours: number): number =>
        history.slice(-hours).reduce((acc, item) => acc + (item.rainMm ?? 0), 0);

    const rain1h = sumLastHours(1);
    const rain6h = sumLastHours(6);
    const rain12h = sumLastHours(12);
    const rain24h = stationWithRain.accumulatedRain24hMm ?? sumLastHours(24);

    return {
        stationName: stationWithRain.stationName,
        isRainingNow: rain1h > 0,
        lastUpdated: extractHourMinute(stationWithRain.lastMeasuredAt),
        maxScale: Math.max(50, Math.ceil(rain24h / 10) * 10),
        measurements: [
            { periodLabel: '1 H', value: Number(rain1h.toFixed(1)) },
            { periodLabel: '6 H', value: Number(rain6h.toFixed(1)) },
            { periodLabel: '12 H', value: Number(rain12h.toFixed(1)) },
            { periodLabel: '24 H', value: Number(rain24h.toFixed(1)) },
        ],
    };
}