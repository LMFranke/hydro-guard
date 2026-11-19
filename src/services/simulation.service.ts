import { ENV } from '../config/env';
import type {
    CityHydrologyMesh,
    HydroWaterwaySegment,
    ImpactedStreetEvaluation,
    SimulatedStreetSegment,
    SimulationStationProfile,
    StreetFloodSeverity,
    StreetQuotaDiagnostic,
} from '../types';
import { createRiverSpatialGrid, findNearestRiverNode } from '../utils';

interface BackendWaterwayDTO {
    id: string;
    name: string;
    kind: 'river' | 'stream' | 'canal';
    channelWidthMeters: number;
    points: [number, number][];
}

interface BackendStreetWayDTO {
    id: string;
    name: string;
    neighborhood: string | null;
    highwayType: string;
    points: [number, number][];
}

interface BackendSimulationGeometryDTO {
    citySlug: string;
    center: [number, number];
    waterways: BackendWaterwayDTO[];
    streets: BackendStreetWayDTO[];
}

interface OverpassElement {
    type: 'way';
    id: number;
    tags?: {
        name?: string;
        waterway?: string;
        highway?: string;
        'addr:suburb'?: string;
        suburb?: string;
    };
    geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
    elements?: OverpassElement[];
}

export interface CitySimulationDataset {
    citySlug: string;
    hydroMesh: CityHydrologyMesh;
    streets: SimulatedStreetSegment[];
}

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const SIMULATION_BROWSER_CACHE = 'hydroguard-simulation-v2';
const DATASET_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TERRARIUM_TILE_URL =
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const WATERWAY_HALF_SPAN_KM = 8.5;
const STREET_HALF_SPAN_KM = 6.5;

const memoryDatasetCache = new Map<string, CitySimulationDataset>();
const inFlightDatasetRequests = new Map<string, Promise<CitySimulationDataset>>();
const elevationTileCache = new Map<string, Promise<Float32Array | null>>();

export function computeEffectiveWaterRiseMeters(
    simulatedLevel: number,
    station: SimulationStationProfile
): number {
    const bankfullStart = Math.max(
        station.minScaleMeters + 0.5,
        station.thresholds.attention * 0.85
    );

    if (simulatedLevel <= bankfullStart) {
        const normalSpan = Math.max(0.5, bankfullStart - station.minScaleMeters);
        const ratio = Math.max(
            0,
            (simulatedLevel - station.minScaleMeters) / normalSpan
        );
        return ratio * 1.05;
    }

    const floodSpan = Math.max(1, station.maxScaleMeters - bankfullStart);
    const floodProgress = Math.max(
        0,
        (simulatedLevel - bankfullStart) / floodSpan
    );
    return 1.2 + floodProgress * 13.8;
}

export function convertEffectiveRiseToStationQuota(
    effectiveRiseMeters: number,
    station: SimulationStationProfile
): number {
    const bankfullStart = Math.max(
        station.minScaleMeters + 0.5,
        station.thresholds.attention * 0.85
    );
    const floodSpan = Math.max(1, station.maxScaleMeters - bankfullStart);
    const normalizedAboveBank = Math.max(0, (effectiveRiseMeters - 1.2) / 13.8);
    const stationQuota = bankfullStart + normalizedAboveBank * floodSpan;
    return Number(stationQuota.toFixed(2));
}

async function readSimulationBrowserCache(
    citySlug: string
): Promise<CitySimulationDataset | null> {
    if (!('caches' in window)) return null;
    try {
        const cache = await window.caches.open(SIMULATION_BROWSER_CACHE);
        const cacheKey = new Request(`https://hydroguard.local/sim-dataset/${citySlug}`);
        const response = await cache.match(cacheKey);
        if (!response) return null;

        const cachedAt = Number(response.headers.get('x-hg-cached-at') ?? '0');
        if (!cachedAt || Date.now() - cachedAt > DATASET_CACHE_TTL_MS) {
            return null;
        }

        const parsed = (await response.json()) as CitySimulationDataset;
        if (!parsed?.hydroMesh || !Array.isArray(parsed.streets)) return null;
        return parsed;
    } catch {
        return null;
    }
}

async function writeSimulationBrowserCache(
    citySlug: string,
    dataset: CitySimulationDataset
): Promise<void> {
    if (!('caches' in window)) return;
    try {
        const cache = await window.caches.open(SIMULATION_BROWSER_CACHE);
        const cacheKey = new Request(`https://hydroguard.local/sim-dataset/${citySlug}`);
        const headers = new Headers({
            'Content-Type': 'application/json',
            'x-hg-cached-at': String(Date.now()),
        });
        await cache.put(
            cacheKey,
            new Response(JSON.stringify(dataset), { status: 200, headers })
        );
    } catch {
        return;
    }
}

export async function fetchCitySimulationDataset(
    citySlug: string,
    center: [number, number]
): Promise<CitySimulationDataset> {
    const memCached = memoryDatasetCache.get(citySlug);
    if (memCached) return memCached;

    const existingPromise = inFlightDatasetRequests.get(citySlug);
    if (existingPromise) return existingPromise;

    const loadPromise = (async (): Promise<CitySimulationDataset> => {
        const browserCached = await readSimulationBrowserCache(citySlug);
        if (browserCached && browserCached.hydroMesh.segments.length > 0) {
            memoryDatasetCache.set(citySlug, browserCached);
            return browserCached;
        }

        const [geometry, demSampler] = await Promise.all([
            fetchUnifiedGeometry(citySlug, center),
            createRegionalElevationSampler(center[0], center[1], 12),
        ]);

        const hydroMesh: CityHydrologyMesh = {
            citySlug,
            center,
            segments: geometry.waterways,
        };

        const streets = buildStreetsFromCompactWays(
            geometry.streets,
            center,
            hydroMesh,
            demSampler
        );

        const dataset: CitySimulationDataset = { citySlug, hydroMesh, streets };

        if (hydroMesh.segments.length > 0 || streets.length > 0) {
            memoryDatasetCache.set(citySlug, dataset);
            void writeSimulationBrowserCache(citySlug, dataset);
        }

        return dataset;
    })();

    inFlightDatasetRequests.set(citySlug, loadPromise);
    try {
        return await loadPromise;
    } finally {
        inFlightDatasetRequests.delete(citySlug);
    }
}

async function fetchUnifiedGeometry(
    citySlug: string,
    center: [number, number]
): Promise<BackendSimulationGeometryDTO> {
    const backendUrl = `${ENV.API_BASE_URL.replace(/\/$/, '')}/simulation/${encodeURIComponent(citySlug)}/geometry`;

    try {
        const response = await fetch(backendUrl, {
            headers: { Accept: 'application/json' },
        });
        if (response.ok) {
            const data = (await response.json()) as BackendSimulationGeometryDTO;
            if (data && Array.isArray(data.waterways) && Array.isArray(data.streets)) {
                return data;
            }
        }
    } catch {
        return fetchUnifiedOverpassFallback(citySlug, center);
    }

    return fetchUnifiedOverpassFallback(citySlug, center);
}

async function fetchUnifiedOverpassFallback(
    citySlug: string,
    center: [number, number]
): Promise<BackendSimulationGeometryDTO> {
    const [lat, lng] = center;
    const cosLat = Math.cos((lat * Math.PI) / 180);

    const wLat = WATERWAY_HALF_SPAN_KM / 111.32;
    const wLng = WATERWAY_HALF_SPAN_KM / (111.32 * cosLat);
    const sLat = STREET_HALF_SPAN_KM / 111.32;
    const sLng = STREET_HALF_SPAN_KM / (111.32 * cosLat);

    const wBbox = `${(lat - wLat).toFixed(5)},${(lng - wLng).toFixed(5)},${(lat + wLat).toFixed(5)},${(lng + wLng).toFixed(5)}`;
    const sBbox = `${(lat - sLat).toFixed(5)},${(lng - sLng).toFixed(5)},${(lat + sLat).toFixed(5)},${(lng + sLng).toFixed(5)}`;

    const query = `[out:json][timeout:25];(way["waterway"~"^(river|stream|canal)$"](${wBbox});way["highway"~"^(trunk|primary|secondary|tertiary|residential)$"]["name"](${sBbox}););out tags geom;`;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: `data=${encodeURIComponent(query)}`,
            });
            if (!response.ok) continue;

            const data = (await response.json()) as OverpassResponse;
            return parseUnifiedOverpassResponse(citySlug, center, data.elements ?? []);
        } catch {
            continue;
        }
    }

    return { citySlug, center, waterways: [], streets: [] };
}

function parseUnifiedOverpassResponse(
    citySlug: string,
    center: [number, number],
    elements: OverpassElement[]
): BackendSimulationGeometryDTO {
    const waterways: HydroWaterwaySegment[] = [];
    const streets: BackendStreetWayDTO[] = [];

    for (const el of elements) {
        if (!el.geometry || el.geometry.length < 2) continue;

        if (el.tags?.waterway) {
            const rawKind = el.tags.waterway;
            const kind: HydroWaterwaySegment['kind'] =
                rawKind === 'river' ? 'river' : rawKind === 'canal' ? 'canal' : 'stream';
            const points: [number, number][] = [];
            const step = el.geometry.length > 60 ? 2 : 1;

            for (let i = 0; i < el.geometry.length; i += step) {
                points.push([el.geometry[i].lat, el.geometry[i].lon]);
            }
            const lastPt = el.geometry[el.geometry.length - 1];
            const lastAdded = points[points.length - 1];
            if (lastAdded[0] !== lastPt.lat || lastAdded[1] !== lastPt.lon) {
                points.push([lastPt.lat, lastPt.lon]);
            }

            waterways.push({
                id: String(el.id),
                name:
                    el.tags.name ??
                    (kind === 'river' ? 'Rio Principal' : 'Ribeirão / Afluente'),
                kind,
                channelWidthMeters: kind === 'river' ? 52 : 14,
                points,
            });
        } else if (el.tags?.highway && el.tags?.name?.trim()) {
            streets.push({
                id: String(el.id),
                name: el.tags.name.trim(),
                neighborhood: el.tags['addr:suburb'] ?? el.tags.suburb ?? null,
                highwayType: el.tags.highway,
                points: el.geometry.map((pt) => [pt.lat, pt.lon]),
            });
        }
    }

    return { citySlug, center, waterways, streets };
}

export function evaluateImpactedStreets(
    streets: SimulatedStreetSegment[],
    station: SimulationStationProfile,
    simulatedLevel: number
): ImpactedStreetEvaluation[] {
    const effectiveWaterRise = computeEffectiveWaterRiseMeters(
        simulatedLevel,
        station
    );

    if (effectiveWaterRise <= 0.4) {
        return [];
    }

    const impacted: ImpactedStreetEvaluation[] = [];

    for (const street of streets) {
        if (effectiveWaterRise < street.baseEffectiveQuotaMeters) {
            continue;
        }

        const depth = Number(
            (effectiveWaterRise - street.baseEffectiveQuotaMeters).toFixed(2)
        );
        const triggerQuotaMeters = convertEffectiveRiseToStationQuota(
            street.baseEffectiveQuotaMeters,
            station
        );
        const severity: StreetFloodSeverity =
            depth >= 1.0 ? 'CRITICAL' : depth >= 0.35 ? 'WARNING' : 'WATCH';

        impacted.push({
            street,
            triggerQuotaMeters,
            waterDepthMeters: Math.max(0.05, depth),
            severity,
        });
    }

    return impacted.sort((a, b) => b.waterDepthMeters - a.waterDepthMeters);
}

export function inspectStreetAtQuota(
    street: SimulatedStreetSegment,
    station: SimulationStationProfile,
    simulatedLevel: number
): StreetQuotaDiagnostic {
    const effectiveWaterRise = computeEffectiveWaterRiseMeters(
        simulatedLevel,
        station
    );
    const triggerQuotaMeters = convertEffectiveRiseToStationQuota(
        street.baseEffectiveQuotaMeters,
        station
    );

    const isFlooded =
        effectiveWaterRise > 0.4 &&
        effectiveWaterRise >= street.baseEffectiveQuotaMeters;

    if (isFlooded) {
        const rawDepth = effectiveWaterRise - street.baseEffectiveQuotaMeters;
        const waterDepthMeters = Math.max(0.05, Number(rawDepth.toFixed(2)));
        const severity: StreetFloodSeverity =
            waterDepthMeters >= 1.0
                ? 'CRITICAL'
                : waterDepthMeters >= 0.35
                    ? 'WARNING'
                    : 'WATCH';

        return {
            street,
            triggerQuotaMeters,
            isFlooded: true,
            waterDepthMeters,
            safetyMarginMeters: 0,
            severity,
        };
    }

    const safetyMarginMeters = Math.max(
        0.1,
        Number((triggerQuotaMeters - simulatedLevel).toFixed(2))
    );

    return {
        street,
        triggerQuotaMeters,
        isFlooded: false,
        waterDepthMeters: 0,
        safetyMarginMeters,
        severity: 'SAFE',
    };
}

export function searchCityStreetsCatalog(
    streets: SimulatedStreetSegment[],
    query: string,
    station: SimulationStationProfile,
    simulatedLevel: number,
    limit = 8
): StreetQuotaDiagnostic[] {
    const normalizedQuery = query
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();

    if (!normalizedQuery) {
        return [];
    }

    const matched = streets.filter((st) => {
        const normName = st.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        const normSuburb = (st.neighborhood ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        return (
            normName.includes(normalizedQuery) || normSuburb.includes(normalizedQuery)
        );
    });

    return matched
        .slice(0, limit)
        .map((street) => inspectStreetAtQuota(street, station, simulatedLevel));
}

function buildStreetsFromCompactWays(
    rawStreets: BackendStreetWayDTO[],
    center: [number, number],
    hydroMesh: CityHydrologyMesh,
    demSampler: ((ptLat: number, ptLng: number) => number | null) | null
): SimulatedStreetSegment[] {
    const spatialGrid = createRiverSpatialGrid(hydroMesh.segments, center[0]);
    if (spatialGrid.nodes.length === 0) return [];

    let minRiverBedElevation = Infinity;
    if (demSampler) {
        for (let i = 0; i < spatialGrid.nodes.length; i++) {
            const rn = spatialGrid.nodes[i];
            const z = demSampler(rn.lat, rn.lng);
            if (
                z !== null &&
                z < minRiverChannelCeiling(rn.isMain) &&
                z < minRiverBedElevation
            ) {
                minRiverBedElevation = z;
            }
        }
    }

    const groupedByStreetName = new Map<
        string,
        {
            id: string;
            name: string;
            neighborhood: string | null;
            highwayType: string;
            focusPoint: [number, number];
            polylines: [number, number][][];
            minDistanceMeters: number;
            minEffectiveQuota: number;
        }
    >();

    for (let s = 0; s < rawStreets.length; s++) {
        const el = rawStreets[s];
        const rawName = el.name?.trim();
        if (!rawName || !el.points || el.points.length < 2) continue;

        const poly = el.points;
        let bestDistSq = Infinity;
        let closestVertex: [number, number] = poly[0];
        let nearestRiverWidth = 30;
        let nearestIsMain = true;
        let foundMatch = false;

        const step = poly.length > 12 ? 2 : 1;
        for (let v = 0; v < poly.length; v += step) {
            const vertex = poly[v];
            const currentSearchRadius = foundMatch
                ? Math.min(1950, Math.sqrt(bestDistSq))
                : 1950;
            const match = findNearestRiverNode(
                spatialGrid,
                vertex[0],
                vertex[1],
                currentSearchRadius
            );

            if (match && match.distSq < bestDistSq) {
                bestDistSq = match.distSq;
                closestVertex = vertex;
                nearestRiverWidth = match.node.width;
                nearestIsMain = match.node.isMain;
                foundMatch = true;
            }
        }

        if (!foundMatch) continue;

        const segmentMinDist = Math.sqrt(bestDistSq);
        const maxReach = nearestIsMain ? 1900 : 650;
        if (segmentMinDist > maxReach) continue;

        let handQuota = 2.2;
        if (demSampler && Number.isFinite(minRiverBedElevation)) {
            const streetZ = demSampler(closestVertex[0], closestVertex[1]);
            if (streetZ !== null) {
                const rawHand = Math.max(0, streetZ - minRiverBedElevation);
                const correctedHand = Math.max(0, rawHand - 1.8) * 0.62;
                const distPenalty =
                    (Math.max(0, segmentMinDist - nearestRiverWidth * 0.65) /
                        (nearestIsMain ? 180 : 85)) *
                    1.15;
                handQuota = Math.max(1.2, correctedHand + distPenalty);
            }
        } else {
            handQuota = 1.4 + (segmentMinDist / (nearestIsMain ? 145 : 75)) * 1.1;
        }

        const effectiveQuota = Number(Math.min(14.8, handQuota).toFixed(2));
        const normKey = rawName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();

        const suburb = el.neighborhood;
        const existing = groupedByStreetName.get(normKey);

        if (!existing) {
            groupedByStreetName.set(normKey, {
                id: `way-${el.id}`,
                name: rawName,
                neighborhood: suburb,
                highwayType: el.highwayType ?? 'residential',
                focusPoint: closestVertex,
                polylines: [poly],
                minDistanceMeters: Math.round(segmentMinDist),
                minEffectiveQuota: effectiveQuota,
            });
        } else {
            if (existing.polylines.length < 6) {
                existing.polylines.push(poly);
            }
            if (!existing.neighborhood && suburb) {
                existing.neighborhood = suburb;
            }
            if (effectiveQuota < existing.minEffectiveQuota) {
                existing.minEffectiveQuota = effectiveQuota;
                existing.focusPoint = closestVertex;
                existing.minDistanceMeters = Math.round(segmentMinDist);
            }
        }
    }

    return Array.from(groupedByStreetName.values())
        .sort((a, b) => a.minEffectiveQuota - b.minEffectiveQuota)
        .slice(0, 300)
        .map((item) => ({
            id: item.id,
            name: item.name,
            neighborhood: item.neighborhood,
            highwayType: item.highwayType,
            focusPoint: item.focusPoint,
            polylines: item.polylines,
            distanceToRiverMeters: item.minDistanceMeters,
            baseEffectiveQuotaMeters: item.minEffectiveQuota,
        }));
}

function minRiverChannelCeiling(isMain: boolean): number {
    return isMain ? 900 : 1200;
}

async function createRegionalElevationSampler(
    lat: number,
    lng: number,
    z: number
): Promise<((ptLat: number, ptLng: number) => number | null) | null> {
    const n = Math.pow(2, z);
    const latRad = (lat * Math.PI) / 180;
    const exactCenterX = ((lng + 180) / 360) * n;
    const exactCenterY =
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const baseTileX = Math.floor(exactCenterX);
    const baseTileY = Math.floor(exactCenterY);
    const offsetX = exactCenterX - baseTileX >= 0.5 ? 1 : -1;
    const offsetY = exactCenterY - baseTileY >= 0.5 ? 1 : -1;

    const tileCoords: Array<[number, number]> = [
        [baseTileX, baseTileY],
        [baseTileX + offsetX, baseTileY],
        [baseTileX, baseTileY + offsetY],
        [baseTileX + offsetX, baseTileY + offsetY],
    ];

    const tiles = await Promise.all(
        tileCoords.map(async ([tx, ty]) => ({
            key: `${tx}:${ty}`,
            data: await fetchDecodedElevationTile(z, tx, ty),
        }))
    );

    const tileMap = new Map<string, Float32Array>();
    for (const tile of tiles) {
        if (tile.data) {
            tileMap.set(tile.key, tile.data);
        }
    }

    if (tileMap.size === 0) return null;

    return (ptLat: number, ptLng: number): number | null => {
        const pLatRad = (ptLat * Math.PI) / 180;
        const exactX = ((ptLng + 180) / 360) * n;
        const exactY =
            ((1 - Math.log(Math.tan(pLatRad) + 1 / Math.cos(pLatRad)) / Math.PI) / 2) *
            n;

        const tx = Math.floor(exactX);
        const ty = Math.floor(exactY);
        const elevations = tileMap.get(`${tx}:${ty}`);
        if (!elevations) return null;

        const col = Math.min(255, Math.max(0, Math.floor((exactX - tx) * 256)));
        const row = Math.min(255, Math.max(0, Math.floor((exactY - ty) * 256)));
        return elevations[row * 256 + col];
    };
}

export function fetchDecodedElevationTile(
    z: number,
    x: number,
    y: number
): Promise<Float32Array | null> {
    const key = `${z}/${x}/${y}`;
    const existing = elevationTileCache.get(key);
    if (existing) return existing;

    const promise = new Promise<Float32Array | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0, 256, 256);
                const { data } = ctx.getImageData(0, 0, 256, 256);
                const elevations = new Float32Array(256 * 256);
                for (let i = 0; i < 65536; i++) {
                    const idx = i * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    elevations[i] = r * 256 + g + b / 256 - 32768;
                }
                resolve(elevations);
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = `${TERRARIUM_TILE_URL}/${z}/${x}/${y}.png`;
    });

    elevationTileCache.set(key, promise);
    return promise;
}