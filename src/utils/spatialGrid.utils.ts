import type { HydroWaterwaySegment } from '../types';

export interface RiverSpatialNode {
    lat: number;
    lng: number;
    isMain: boolean;
    width: number;
}

export interface RiverSpatialGrid {
    cells: Map<number, RiverSpatialNode[]>;
    nodes: RiverSpatialNode[];
    cosLat: number;
    degLngToMeters: number;
    minCellSizeMeters: number;
}

export interface NearestRiverMatch {
    node: RiverSpatialNode;
    distSq: number;
    distMeters: number;
}

const CELL_SIZE_DEG = 0.0025;
const LAT_OFFSET = 90;
const LNG_OFFSET = 180;
const GRID_STRIDE = 262144;
const DEG_LAT_METERS = 111320;

function toCellCoord(value: number, offset: number): number {
    return Math.floor((value + offset) / CELL_SIZE_DEG);
}

function packCellKey(cellLat: number, cellLng: number): number {
    return cellLat * GRID_STRIDE + cellLng;
}

export function createRiverSpatialGrid(
    segments: HydroWaterwaySegment[],
    referenceLat: number
): RiverSpatialGrid {
    const cosLat = Math.cos((referenceLat * Math.PI) / 180);
    const degLngToMeters = DEG_LAT_METERS * cosLat;
    const minCellSizeMeters = CELL_SIZE_DEG * Math.min(DEG_LAT_METERS, degLngToMeters);
    const cells = new Map<number, RiverSpatialNode[]>();
    const nodes: RiverSpatialNode[] = [];

    for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        const isMain = seg.kind === 'river';
        const width = seg.channelWidthMeters;
        const pts = seg.points;

        for (let p = 0; p < pts.length; p++) {
            const lat = pts[p][0];
            const lng = pts[p][1];
            const node: RiverSpatialNode = { lat, lng, isMain, width };
            nodes.push(node);

            const key = packCellKey(
                toCellCoord(lat, LAT_OFFSET),
                toCellCoord(lng, LNG_OFFSET)
            );
            const bucket = cells.get(key);
            if (bucket) {
                bucket.push(node);
            } else {
                cells.set(key, [node]);
            }
        }
    }

    return {
        cells,
        nodes,
        cosLat,
        degLngToMeters,
        minCellSizeMeters,
    };
}

export function findNearestRiverNode(
    grid: RiverSpatialGrid,
    lat: number,
    lng: number,
    maxRadiusMeters: number
): NearestRiverMatch | null {
    if (grid.nodes.length === 0) return null;

    const centerCellLat = toCellCoord(lat, LAT_OFFSET);
    const centerCellLng = toCellCoord(lng, LNG_OFFSET);
    const maxRing = Math.ceil(maxRadiusMeters / grid.minCellSizeMeters) + 1;
    const maxRadiusSq = maxRadiusMeters * maxRadiusMeters;
    const degLngToMeters = grid.degLngToMeters;

    let bestDistSq = maxRadiusSq;
    let bestNode: RiverSpatialNode | null = null;

    const scanCell = (cLat: number, cLng: number) => {
        const bucket = grid.cells.get(packCellKey(cLat, cLng));
        if (!bucket) return;

        for (let i = 0; i < bucket.length; i++) {
            const node = bucket[i];
            const dy = (lat - node.lat) * DEG_LAT_METERS;
            const dx = (lng - node.lng) * degLngToMeters;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestNode = node;
            }
        }
    };

    for (let r = 0; r <= maxRing; r++) {
        if (r === 0) {
            scanCell(centerCellLat, centerCellLng);
        } else {
            const minLat = centerCellLat - r;
            const maxLat = centerCellLat + r;
            const minLng = centerCellLng - r;
            const maxLng = centerCellLng + r;

            for (let cLng = minLng; cLng <= maxLng; cLng++) {
                scanCell(minLat, cLng);
                scanCell(maxLat, cLng);
            }
            for (let cLat = minLat + 1; cLat <= maxLat - 1; cLat++) {
                scanCell(cLat, minLng);
                scanCell(cLat, maxLng);
            }
        }

        if (bestNode !== null) {
            const nextRingMinDist = r * grid.minCellSizeMeters;
            if (bestDistSq <= nextRingMinDist * nextRingMinDist) {
                break;
            }
        }
    }

    if (bestNode === null) return null;

    return {
        node: bestNode,
        distSq: bestDistSq,
        distMeters: Math.sqrt(bestDistSq),
    };
}