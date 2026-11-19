import type { CityHydrologyMesh } from '../types';
import {
    createRiverSpatialGrid,
    findNearestRiverNode,
    type RiverSpatialGrid,
} from '../utils/spatialGrid.utils';

interface InitMeshMessage {
    type: 'INIT_MESH';
    meshVersion: number;
    mesh: CityHydrologyMesh | null;
}

interface ComputeTileMessage {
    type: 'COMPUTE_TILE';
    requestId: number;
    meshVersion: number;
    northLat: number;
    southLat: number;
    westLng: number;
    eastLng: number;
    gridRes: number;
    terrainGrid: Float32Array;
}

type WorkerInMessage = InitMeshMessage | ComputeTileMessage;

interface TileResultMessage {
    type: 'TILE_RESULT';
    requestId: number;
    meshVersion: number;
    requiredLevelGrid: Float32Array;
}

const workerScope = self as unknown as {
    onmessage: ((event: MessageEvent<WorkerInMessage>) => void) | null;
    postMessage: (message: TileResultMessage, transfer?: Transferable[]) => void;
};

let currentMeshVersion = 0;
let spatialGrid: RiverSpatialGrid | null = null;

function computeTileRequiredGrid(msg: ComputeTileMessage): Float32Array {
    const {
        northLat,
        southLat,
        westLng,
        eastLng,
        gridRes,
        terrainGrid,
    } = msg;

    const totalCells = gridRes * gridRes;
    const requiredLevelGrid = new Float32Array(totalCells);
    requiredLevelGrid.fill(999);

    if (!spatialGrid || spatialGrid.nodes.length === 0) {
        return requiredLevelGrid;
    }

    const distGrid = new Float32Array(totalCells);
    const channelWidthGrid = new Float32Array(totalCells);
    const isMainRiverGrid = new Uint8Array(totalCells);
    const latSpan = southLat - northLat;
    const lngSpan = eastLng - westLng;

    let minRiverChannelElevation = Infinity;

    for (let r = 0; r < gridRes; r++) {
        const lat = northLat + ((r + 0.5) / gridRes) * latSpan;
        const rowOffset = r * gridRes;

        for (let c = 0; c < gridRes; c++) {
            const lng = westLng + ((c + 0.5) / gridRes) * lngSpan;
            const idx = rowOffset + c;
            const match = findNearestRiverNode(spatialGrid, lat, lng, 2200);

            if (!match) {
                distGrid[idx] = 9999;
                continue;
            }

            distGrid[idx] = match.distMeters;
            channelWidthGrid[idx] = match.node.width;
            isMainRiverGrid[idx] = match.node.isMain ? 1 : 0;

            if (match.distMeters <= match.node.width * 1.5) {
                const z = terrainGrid[idx];
                if (z < minRiverChannelElevation) {
                    minRiverChannelElevation = z;
                }
            }
        }
    }

    if (!Number.isFinite(minRiverChannelElevation)) {
        for (let i = 0; i < totalCells; i++) {
            if (terrainGrid[i] < minRiverChannelElevation) {
                minRiverChannelElevation = terrainGrid[i];
            }
        }
    }

    for (let i = 0; i < totalCells; i++) {
        const dist = distGrid[i];
        const channelW = channelWidthGrid[i];
        const isMain = isMainRiverGrid[i] === 1;
        const maxFloodplainReach = isMain ? 2200 : 750;

        if (dist > maxFloodplainReach) {
            continue;
        }

        if (dist <= channelW * 0.65) {
            requiredLevelGrid[i] = 0.2;
            continue;
        }

        const rawHand = Math.max(0, terrainGrid[i] - minRiverChannelElevation);
        const correctedHand = Math.max(0, rawHand - 1.8) * 0.62;
        const distancePenalty =
            ((dist - channelW * 0.65) / (isMain ? 180 : 85)) * 1.15;
        requiredLevelGrid[i] = Math.max(0.5, correctedHand + distancePenalty);
    }

    return requiredLevelGrid;
}

workerScope.onmessage = (event: MessageEvent<WorkerInMessage>) => {
    const msg = event.data;

    if (msg.type === 'INIT_MESH') {
        currentMeshVersion = msg.meshVersion;
        if (msg.mesh && msg.mesh.segments.length > 0) {
            spatialGrid = createRiverSpatialGrid(msg.mesh.segments, msg.mesh.center[0]);
        } else {
            spatialGrid = null;
        }
        return;
    }

    if (msg.type === 'COMPUTE_TILE') {
        const requiredLevelGrid =
            msg.meshVersion === currentMeshVersion
                ? computeTileRequiredGrid(msg)
                : new Float32Array(msg.gridRes * msg.gridRes).fill(999);

        workerScope.postMessage(
            {
                type: 'TILE_RESULT',
                requestId: msg.requestId,
                meshVersion: msg.meshVersion,
                requiredLevelGrid,
            },
            [requiredLevelGrid.buffer]
        );
    }
};