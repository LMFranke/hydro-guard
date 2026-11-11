import type {
    RainGaugeData,
    RiverData,
    RiverHistoryData,
    StationTelemetryDTO,
    TelemetryStationMarker,
} from '../types';
import { httpClient } from './httpClient';
import {
    mapStationsToMapMarkers,
    mapStationsToRainData,
    mapStationsToRiverCards,
    mapStationsToRiverHistory,
} from './mappers';

export interface MappedCityTelemetry {
    rawStations: StationTelemetryDTO[];
    rivers: RiverData[];
    stationMarkers: TelemetryStationMarker[];
    historyData: RiverHistoryData[];
    rainData: RainGaugeData;
}

export async function fetchCityTelemetry(
    slug: string
): Promise<StationTelemetryDTO[]> {
    return httpClient.get<StationTelemetryDTO[]>(
        `/telemetry/${encodeURIComponent(slug)}`
    );
}

export async function fetchMappedCityTelemetry(
    slug: string
): Promise<MappedCityTelemetry> {
    const rawStations = await fetchCityTelemetry(slug);

    return {
        rawStations,
        rivers: mapStationsToRiverCards(rawStations),
        stationMarkers: mapStationsToMapMarkers(rawStations),
        historyData: mapStationsToRiverHistory(rawStations),
        rainData: mapStationsToRainData(rawStations),
    };
}