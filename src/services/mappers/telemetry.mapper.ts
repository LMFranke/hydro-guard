import type {
    RainGaugeData,
    RiverData,
    RiverHistoryData,
    StationTelemetryDTO,
    TelemetryReadingDTO,
    TelemetryStationMarker,
    WaterTrend,
} from '../../types';
import {
    extractHourMinute,
    formatShortDateTimePtBr,
    mapBackendStationStatus,
    normalizeAnaTimestamp,
} from '../../utils';

const STALE_READING_THRESHOLD_MINUTES = 180;
const ANA_SOURCE_NAME = 'Agência Nacional de Águas (ANA - HidroWeb)';

function evaluateReadingAgeMinutes(rawTimestamp: string | null): number | null {
    if (!rawTimestamp || rawTimestamp.trim() === '') return null;
    const iso = normalizeAnaTimestamp(rawTimestamp);
    const withTz =
        iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}-03:00`;
    const parsedMs = Date.parse(withTz);
    if (Number.isNaN(parsedMs)) return null;
    return Math.max(0, Math.round((Date.now() - parsedMs) / 60000));
}

function computeRiverTrend(history: TelemetryReadingDTO[]): {
    trend: WaterTrend;
    deltaCm: number;
} {
    const validLevels = history
        .map((h) => h.levelMeters)
        .filter((lvl): lvl is number => lvl !== null && !Number.isNaN(lvl));

    if (validLevels.length < 2) {
        return { trend: 'STABLE', deltaCm: 0 };
    }

    const latest = validLevels[validLevels.length - 1];
    const comparisonIndex = Math.max(0, validLevels.length - 4);
    const reference = validLevels[comparisonIndex];
    const deltaCm = Math.round((latest - reference) * 100);

    if (deltaCm >= 2) return { trend: 'RISING', deltaCm };
    if (deltaCm <= -2) return { trend: 'FALLING', deltaCm };
    return { trend: 'STABLE', deltaCm };
}

export function mapStationsToRiverCards(
    stations: StationTelemetryDTO[]
): RiverData[] {
    return stations
        .filter(
            (s) =>
                s.stationType.toLowerCase() === 'fluviometrica' &&
                s.currentLevelMeters !== null
        )
        .map((station) => {
            const currentLevel = Number((station.currentLevelMeters ?? 0).toFixed(2));
            const criticalLevel =
                station.thresholdCritical > 0 ? station.thresholdCritical : 6.0;
            const capacityPercent = Math.min(
                Math.round((currentLevel / criticalLevel) * 1000) / 10,
                100
            );

            const { trend, deltaCm } = computeRiverTrend(station.history ?? []);
            const ageMinutes = evaluateReadingAgeMinutes(station.lastMeasuredAt);
            const isStale =
                ageMinutes === null || ageMinutes > STALE_READING_THRESHOLD_MINUTES;

            const formattedUpdate = station.lastMeasuredAt
                ? formatShortDateTimePtBr(normalizeAnaTimestamp(station.lastMeasuredAt))
                : 'Horário indisponível';

            return {
                id: station.stationCode,
                name: station.riverName || 'Rio Monitorado',
                location: station.stationName,
                currentLevel,
                flowRate:
                    station.currentFlowM3s !== null
                        ? Math.round(station.currentFlowM3s * 10) / 10
                        : null,
                capacityPercent,
                status: mapBackendStationStatus(station.status),
                trend,
                trendDeltaCm: deltaCm,
                lastUpdate: formattedUpdate,
                source: `${ANA_SOURCE_NAME} • Estação #${station.stationCode}`,
                isStale,
                readingAgeMinutes: ageMinutes,
            };
        });
}

export function mapStationsToMapMarkers(
    stations: StationTelemetryDTO[]
): TelemetryStationMarker[] {
    return stations
        .filter(
            (s): s is StationTelemetryDTO & { latitude: number; longitude: number } =>
                typeof s.latitude === 'number' &&
                typeof s.longitude === 'number' &&
                !Number.isNaN(s.latitude) &&
                !Number.isNaN(s.longitude)
        )
        .map((station) => {
            const ageMinutes = evaluateReadingAgeMinutes(station.lastMeasuredAt);
            const isStale =
                ageMinutes === null || ageMinutes > STALE_READING_THRESHOLD_MINUTES;

            return {
                stationCode: station.stationCode,
                stationName: station.stationName,
                stationType: station.stationType,
                riverName: station.riverName || 'Pluviômetro Urbano',
                coordinates: [station.latitude, station.longitude],
                currentLevelMeters:
                    station.currentLevelMeters !== null
                        ? Number(station.currentLevelMeters.toFixed(2))
                        : null,
                currentFlowM3s:
                    station.currentFlowM3s !== null
                        ? Math.round(station.currentFlowM3s * 10) / 10
                        : null,
                accumulatedRain24hMm: Number(
                    (station.accumulatedRain24hMm ?? 0).toFixed(1)
                ),
                status: mapBackendStationStatus(station.status),
                lastRead: normalizeAnaTimestamp(station.lastMeasuredAt),
                source: `${ANA_SOURCE_NAME} • Estação #${station.stationCode}`,
                isStale,
            };
        });
}

export function mapStationsToRiverHistory(
    stations: StationTelemetryDTO[]
): RiverHistoryData[] {
    return stations
        .filter(
            (s) =>
                s.stationType.toLowerCase() === 'fluviometrica' &&
                s.history &&
                s.history.length > 0
        )
        .map((station) => {
            const ageMinutes = evaluateReadingAgeMinutes(station.lastMeasuredAt);
            const isStale =
                ageMinutes === null || ageMinutes > STALE_READING_THRESHOLD_MINUTES;
            const formattedUpdate = station.lastMeasuredAt
                ? formatShortDateTimePtBr(normalizeAnaTimestamp(station.lastMeasuredAt))
                : 'Horário indisponível';

            return {
                riverId: station.stationCode,
                riverName: `${station.riverName} (${station.stationName})`,
                stationName: station.stationName,
                source: `${ANA_SOURCE_NAME} • Estação #${station.stationCode}`,
                lastUpdate: formattedUpdate,
                isStale,
                thresholds: {
                    attention: Number((station.thresholdWarning || 4.0).toFixed(2)),
                    warning: Number((station.thresholdAlert || 5.0).toFixed(2)),
                    emergency: Number((station.thresholdCritical || 6.0).toFixed(2)),
                },
                history: station.history
                    .filter((h) => h.levelMeters !== null)
                    .slice(-24)
                    .map((h) => ({
                        time: extractHourMinute(h.measuredAt),
                        level: Number((h.levelMeters ?? 0).toFixed(2)),
                    })),
            };
        });
}

export function mapStationsToRainData(
    stations: StationTelemetryDTO[]
): RainGaugeData | null {
    const pluvStation =
        stations.find((s) => s.stationType.toLowerCase() === 'pluviometrica') ??
        stations[0];

    if (!pluvStation) {
        return null;
    }

    const history = pluvStation.history ?? [];

    const sumLastHours = (hoursCount: number): number => {
        const slice = history.slice(-hoursCount);
        const total = slice.reduce((acc, item) => acc + (item.rainMm ?? 0), 0);
        return Math.round(total * 10) / 10;
    };

    const rain1h = sumLastHours(1);
    const rain3h = sumLastHours(3);
    const rain6h = sumLastHours(6);
    const rain12h = sumLastHours(12);
    const rain24h =
        pluvStation.accumulatedRain24hMm !== null
            ? Math.round(pluvStation.accumulatedRain24hMm * 10) / 10
            : sumLastHours(24);

    const ageMinutes = evaluateReadingAgeMinutes(pluvStation.lastMeasuredAt);
    const isStale =
        ageMinutes === null || ageMinutes > STALE_READING_THRESHOLD_MINUTES;

    return {
        stationId: pluvStation.stationCode,
        stationName: `${pluvStation.stationName} (#${pluvStation.stationCode})`,
        isRainingNow: rain1h > 0.2,
        maxScale: Math.max(100, Math.ceil((rain24h + 20) / 50) * 50),
        lastUpdated: extractHourMinute(pluvStation.lastMeasuredAt),
        source: `${ANA_SOURCE_NAME} • Estação #${pluvStation.stationCode}`,
        isStale,
        measurements: [
            { periodLabel: '1h', value: rain1h },
            { periodLabel: '3h', value: rain3h },
            { periodLabel: '6h', value: rain6h },
            { periodLabel: '12h', value: rain12h },
            { periodLabel: '24h', value: rain24h },
        ],
    };
}