import type {
    CityHydrologyMesh,
    HydroWaterwaySegment,
    ImpactedStreetEvaluation,
    SimulatedStreetSegment,
    SimulationStationProfile,
    StreetFloodSeverity,
    StreetQuotaDiagnostic,
} from '../types';
import { readCache, writeCache } from '../utils';

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
    'https://lz4.overpass-api.de/api/interpreter',
];

const SIMULATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const TERRARIUM_TILE_URL =
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

const elevationTileCache = new Map<string, Promise<Float32Array | null>>();

/**
 * Converte o nível selecionado no slider para a elevação hidrostática efetiva (0m a 15m).
 */
/**
 * Converte o nível selecionado no slider para a elevação hidrostática efetiva (0m a 15m),
 * garantindo que durante a faixa de Normalidade a água fique contida na calha (< 1.1m)
 * e só transborde para as primeiras vias a partir do limiar de Observação/Atenção.
 */
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

/**
 * Converte a cota topográfica de uma rua (HAND) para o valor correspondente
 * na régua da estação selecionada (em metros).
 */
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

/**
 * Carrega simultaneamente a malha hidrográfica e o catálogo de cotas das ruas do município.
 */
export async function fetchCitySimulationDataset(
    citySlug: string,
    center: [number, number]
): Promise<CitySimulationDataset> {
    const hydroMesh = await fetchCityHydrologyMesh(citySlug, center);
    const streets = await fetchCityStreetQuotaCatalog(citySlug, center, hydroMesh);
    return { citySlug, hydroMesh, streets };
}

export async function fetchCityHydrologyMesh(
    citySlug: string,
    center: [number, number]
): Promise<CityHydrologyMesh> {
    const cacheKey = `hydro_mesh_v2_${citySlug}`;
    const cached = readCache<CityHydrologyMesh>(cacheKey);

    if (cached && !cached.isExpired && cached.data.segments.length > 0) {
        return cached.data;
    }

    const [lat, lng] = center;
    const query = `[out:json][timeout:18];(way["waterway"~"^(river|stream|canal)$"](around:7500,${lat},${lng}););out body geom;`;

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
            const segments = parseOverpassWaterways(data.elements ?? []);

            if (segments.length > 0) {
                const mesh: CityHydrologyMesh = { citySlug, center, segments };
                writeCache(cacheKey, mesh, SIMULATION_CACHE_TTL_MS);
                return mesh;
            }
        } catch {
            // Tenta o próximo mirror oficial da Overpass API
        }
    }

    return cached?.data ?? { citySlug, center, segments: [] };
}

export async function fetchCityStreetQuotaCatalog(
    citySlug: string,
    center: [number, number],
    hydroMesh: CityHydrologyMesh
): Promise<SimulatedStreetSegment[]> {
    const cacheKey = `street_quotas_v2_${citySlug}`;
    const cached = readCache<SimulatedStreetSegment[]>(cacheKey);

    if (cached && !cached.isExpired && cached.data.length > 0) {
        return cached.data;
    }

    const [lat, lng] = center;
    const query = `[out:json][timeout:18];(way["highway"~"^(primary|secondary|tertiary|residential|trunk|living_street)$"]["name"](around:4800,${lat},${lng}););out body geom;`;

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
            const streets = await buildStreetsFromOverpass(
                data.elements ?? [],
                center,
                hydroMesh
            );

            if (streets.length > 0) {
                writeCache(cacheKey, streets, SIMULATION_CACHE_TTL_MS);
                return streets;
            }
        } catch {
            // Tenta o próximo mirror oficial da Overpass API
        }
    }

    return cached?.data ?? [];
}

/**
 * Avalia quais ruas estão alagadas no nível atual do slider e calcula a lâmina d'água.
 */
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

/**
 * Gera o diagnóstico completo de uma via específica para o nível atual do simulador,
 * informando se está segura (e qual a margem em metros) ou alagada (e qual a lâmina).
 */
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

/**
 * Pesquisa ruas no catálogo topográfico do município por nome ou bairro
 * e retorna os resultados já enriquecidos com o diagnóstico na cota atual.
 */
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

async function buildStreetsFromOverpass(
    elements: OverpassElement[],
    center: [number, number],
    hydroMesh: CityHydrologyMesh
): Promise<SimulatedStreetSegment[]> {
    const cosLat = Math.cos((center[0] * Math.PI) / 180);

    // Achata pontos dos rios para busca rápida de proximidade
    const riverNodes: Array<{
        lat: number;
        lng: number;
        isMain: boolean;
        width: number;
    }> = [];

    for (const seg of hydroMesh.segments) {
        const isMain = seg.kind === 'river';
        for (const [rLat, rLng] of seg.points) {
            riverNodes.push({
                lat: rLat,
                lng: rLng,
                isMain,
                width: seg.channelWidthMeters,
            });
        }
    }

    // Pré-carrega o bloco de elevação (zoom 13) que cobre o centro urbano para calibrar as cotas reais
    const demSampler = await createCenterElevationSampler(center[0], center[1], 13);

    let minRiverBedElevation = Infinity;
    if (demSampler) {
        for (const rn of riverNodes) {
            const z = demSampler(rn.lat, rn.lng);
            if (z !== null && z < minRiverChannelCeiling(rn.isMain) && z < minRiverBedElevation) {
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

    for (const el of elements) {
        const rawName = el.tags?.name?.trim();
        if (!rawName || !el.geometry || el.geometry.length < 2) continue;

        const poly: [number, number][] = el.geometry.map((pt) => [pt.lat, pt.lon]);

        // Encontra o vértice da rua mais próximo da rede hidrográfica
        let segmentMinDist = Infinity;
        let closestVertex: [number, number] = poly[0];
        let nearestRiverWidth = 30;
        let nearestIsMain = true;

        for (const [vLat, vLng] of poly) {
            for (let i = 0; i < riverNodes.length; i++) {
                const rn = riverNodes[i];
                const dy = (vLat - rn.lat) * 111320;
                const dx = (vLng - rn.lng) * 111320 * cosLat;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < segmentMinDist) {
                    segmentMinDist = dist;
                    closestVertex = [vLat, vLng];
                    nearestRiverWidth = rn.width;
                    nearestIsMain = rn.isMain;
                }
            }
        }

        const maxReach = nearestIsMain ? 1900 : 650;
        if (segmentMinDist > maxReach) continue;

        // Calcula a cota necessária usando a mesma equação HAND da camada de inundação
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
            handQuota =
                1.4 +
                (segmentMinDist / (nearestIsMain ? 145 : 75)) * 1.1;
        }

        const effectiveQuota = Number(Math.min(14.8, handQuota).toFixed(2));
        const normKey = rawName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();

        const suburb = el.tags?.['addr:suburb'] ?? el.tags?.suburb ?? null;
        const existing = groupedByStreetName.get(normKey);

        if (!existing) {
            groupedByStreetName.set(normKey, {
                id: `way-${el.id}`,
                name: rawName,
                neighborhood: suburb,
                highwayType: el.tags?.highway ?? 'residential',
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
        .slice(0, 120)
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

async function createCenterElevationSampler(
    lat: number,
    lng: number,
    z: number
): Promise<((ptLat: number, ptLng: number) => number | null) | null> {
    const n = Math.pow(2, z);
    const latRad = (lat * Math.PI) / 180;
    const centerTileX = Math.floor(((lng + 180) / 360) * n);
    const centerTileY = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );

    const elevations = await fetchDecodedElevationTile(z, centerTileX, centerTileY);
    if (!elevations) return null;

    return (ptLat: number, ptLng: number): number | null => {
        const pLatRad = (ptLat * Math.PI) / 180;
        const exactX = ((ptLng + 180) / 360) * n;
        const exactY =
            ((1 - Math.log(Math.tan(pLatRad) + 1 / Math.cos(pLatRad)) / Math.PI) /
                2) *
            n;

        if (
            Math.floor(exactX) !== centerTileX ||
            Math.floor(exactY) !== centerTileY
        ) {
            return null;
        }

        const col = Math.min(255, Math.max(0, Math.floor((exactX - centerTileX) * 256)));
        const row = Math.min(255, Math.max(0, Math.floor((exactY - centerTileY) * 256)));
        return elevations[row * 256 + col];
    };
}

function parseOverpassWaterways(
    elements: OverpassElement[]
): HydroWaterwaySegment[] {
    const segments: HydroWaterwaySegment[] = [];

    for (const el of elements) {
        if (!el.geometry || el.geometry.length < 2) continue;

        const rawKind = el.tags?.waterway ?? 'stream';
        const kind: HydroWaterwaySegment['kind'] =
            rawKind === 'river' ? 'river' : rawKind === 'canal' ? 'canal' : 'stream';

        const points: [number, number][] = [];
        const step = el.geometry.length > 80 ? 2 : 1;

        for (let i = 0; i < el.geometry.length; i += step) {
            points.push([el.geometry[i].lat, el.geometry[i].lon]);
        }

        const lastPt = el.geometry[el.geometry.length - 1];
        const lastAdded = points[points.length - 1];
        if (lastAdded[0] !== lastPt.lat || lastAdded[1] !== lastPt.lon) {
            points.push([lastPt.lat, lastPt.lon]);
        }

        segments.push({
            id: String(el.id),
            name:
                el.tags?.name ??
                (kind === 'river' ? 'Rio Principal' : 'Ribeirão / Afluente'),
            kind,
            channelWidthMeters: kind === 'river' ? 52 : 14,
            points,
        });
    }

    return segments;
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