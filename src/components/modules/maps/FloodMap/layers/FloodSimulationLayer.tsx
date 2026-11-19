import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
    computeEffectiveWaterRiseMeters,
    fetchDecodedElevationTile,
} from '../../../../../services';
import type {
    CityHydrologyMesh,
    HydroWaterwaySegment,
    ImpactedStreetEvaluation,
    SimulationStationProfile,
    StreetFloodSeverity,
    StreetQuotaDiagnostic,
} from '../../../../../types';

interface FloodSimulationLayerProps {
    hydroMesh: CityHydrologyMesh | null;
    isLoadingData: boolean;
    selectedStation: SimulationStationProfile;
    stationCoordinates: [number, number];
    simulatedLevel: number;
    impactedStreets: ImpactedStreetEvaluation[];
    inspectedDiagnostic: StreetQuotaDiagnostic | null;
    onSelectStreet: (streetId: string, coords: [number, number]) => void;
}

const GRID_RES = 64;
const DEM_MAX_NATIVE_ZOOM = 14;

const STREET_SEVERITY_COLOR: Record<StreetFloodSeverity, string> = {
    CRITICAL: '#ef4444',
    WARNING: '#f97316',
    WATCH: '#facc15',
};

interface PreparedTileData {
    canvas: HTMLCanvasElement;
    requiredLevelGrid: Float32Array;
}

interface WorkerTileResponse {
    type: 'TILE_RESULT';
    requestId: number;
    meshVersion: number;
    requiredLevelGrid: Float32Array;
}

function tileXYToLatLng(
    x: number,
    y: number,
    z: number
): [number, number] {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    const lng = (x / Math.pow(2, z)) * 360 - 180;
    return [lat, lng];
}

class TopographicFloodGridLayer extends L.GridLayer {
    private preparedTiles = new Map<string, PreparedTileData>();
    private activeTileKeys = new Set<string>();
    private pendingRequests = new Map<number, (grid: Float32Array | null) => void>();
    private worker: Worker | null = null;
    private mesh: CityHydrologyMesh | null = null;
    private meshVersion = 0;
    private nextRequestId = 1;
    private effectiveWaterMeters = 2.5;
    private paintRafId: number | null = null;

    private offscreenCanvas: HTMLCanvasElement;
    private offscreenCtx: CanvasRenderingContext2D | null;
    private offscreenImageData: ImageData | null;

    private readonly handleTileUnload = (e: L.TileEvent) => {
        const unloadedKey = this.tileCoordsToKey(e.coords);
        this.activeTileKeys.delete(unloadedKey);
        this.preparedTiles.delete(unloadedKey);
    };

    constructor(options?: L.GridLayerOptions) {
        super(options);
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = GRID_RES;
        this.offscreenCanvas.height = GRID_RES;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.offscreenImageData = this.offscreenCtx
            ? this.offscreenCtx.createImageData(GRID_RES, GRID_RES)
            : null;
    }

    public override onAdd(map: L.Map): this {
        this.ensureWorker();
        this.on('tileunload', this.handleTileUnload);
        return super.onAdd(map);
    }

    public override onRemove(map: L.Map): this {
        this.off('tileunload', this.handleTileUnload);
        if (this.paintRafId !== null) {
            window.cancelAnimationFrame(this.paintRafId);
            this.paintRafId = null;
        }
        this.activeTileKeys.clear();
        this.preparedTiles.clear();
        for (const resolve of this.pendingRequests.values()) {
            resolve(null);
        }
        this.pendingRequests.clear();
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        return super.onRemove(map);
    }

    public setHydrologyMesh(mesh: CityHydrologyMesh | null) {
        this.mesh = mesh;
        this.meshVersion += 1;
        this.preparedTiles.clear();
        this.ensureWorker();
        this.worker?.postMessage({
            type: 'INIT_MESH',
            meshVersion: this.meshVersion,
            mesh,
        });
        this.redraw();
    }

    public setEffectiveWaterMeters(waterMeters: number) {
        this.effectiveWaterMeters = waterMeters;
        if (this.paintRafId !== null) return;

        this.paintRafId = window.requestAnimationFrame(() => {
            this.paintRafId = null;
            for (const tileData of this.preparedTiles.values()) {
                this.paintTileCanvas(tileData);
            }
        });
    }

    protected override createTile(
        coords: L.Coords,
        done: L.DoneCallback
    ): HTMLElement {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        canvas.className = 'hg-sim-canvas-tile';

        const tileKey = this.tileCoordsToKey(coords);
        const requestMeshVersion = this.meshVersion;
        this.activeTileKeys.add(tileKey);

        void this.buildTileElevationModel(coords, canvas, requestMeshVersion).then(
            (prepared) => {
                if (
                    prepared &&
                    requestMeshVersion === this.meshVersion &&
                    this.activeTileKeys.has(tileKey)
                ) {
                    this.preparedTiles.set(tileKey, prepared);
                    this.paintTileCanvas(prepared);
                }
                done(undefined, canvas);
            }
        );

        return canvas;
    }

    private ensureWorker() {
        if (this.worker) return;
        this.worker = new Worker(
            new URL(
                '../../../../../workers/floodSimulation.worker.ts',
                import.meta.url
            ),
            { type: 'module' }
        );
        this.worker.onmessage = (event: MessageEvent<WorkerTileResponse>) => {
            const msg = event.data;
            if (msg.type !== 'TILE_RESULT') return;
            const resolver = this.pendingRequests.get(msg.requestId);
            if (!resolver) return;
            this.pendingRequests.delete(msg.requestId);
            resolver(
                msg.meshVersion === this.meshVersion ? msg.requiredLevelGrid : null
            );
        };
    }

    private async buildTileElevationModel(
        coords: L.Coords,
        canvas: HTMLCanvasElement,
        requestMeshVersion: number
    ): Promise<PreparedTileData | null> {
        if (!this.mesh || this.mesh.segments.length === 0) {
            return null;
        }

        const demZ = Math.min(coords.z, DEM_MAX_NATIVE_ZOOM);
        const zoomDiff = coords.z - demZ;
        const scale = 1 << zoomDiff;
        const demX = Math.floor(coords.x / scale);
        const demY = Math.floor(coords.y / scale);

        const demElevations = await fetchDecodedElevationTile(demZ, demX, demY);
        if (!demElevations || requestMeshVersion !== this.meshVersion || !this.worker) {
            return null;
        }

        const subOffsetX = (coords.x % scale) * (256 / scale);
        const subOffsetY = (coords.y % scale) * (256 / scale);
        const subSize = 256 / scale;
        const terrainGrid = new Float32Array(GRID_RES * GRID_RES);

        for (let r = 0; r < GRID_RES; r++) {
            const demRow = Math.min(
                255,
                Math.floor(subOffsetY + ((r + 0.5) / GRID_RES) * subSize)
            );
            const demRowOffset = demRow * 256;
            const gridRowOffset = r * GRID_RES;

            for (let c = 0; c < GRID_RES; c++) {
                const demCol = Math.min(
                    255,
                    Math.floor(subOffsetX + ((c + 0.5) / GRID_RES) * subSize)
                );
                terrainGrid[gridRowOffset + c] = demElevations[demRowOffset + demCol];
            }
        }

        const [northLat, westLng] = tileXYToLatLng(coords.x, coords.y, coords.z);
        const [southLat, eastLng] = tileXYToLatLng(
            coords.x + 1,
            coords.y + 1,
            coords.z
        );

        const requestId = this.nextRequestId++;
        const requiredLevelGrid = await new Promise<Float32Array | null>(
            (resolve) => {
                if (!this.worker) {
                    resolve(null);
                    return;
                }
                this.pendingRequests.set(requestId, resolve);
                this.worker.postMessage(
                    {
                        type: 'COMPUTE_TILE',
                        requestId,
                        meshVersion: requestMeshVersion,
                        northLat,
                        southLat,
                        westLng,
                        eastLng,
                        gridRes: GRID_RES,
                        terrainGrid,
                    },
                    [terrainGrid.buffer]
                );
            }
        );

        if (!requiredLevelGrid) return null;
        return { canvas, requiredLevelGrid };
    }

    private paintTileCanvas(tileData: PreparedTileData) {
        const { canvas, requiredLevelGrid } = tileData;
        const ctx = canvas.getContext('2d');
        if (!ctx || !this.offscreenCtx || !this.offscreenImageData) return;

        const waterLevel = this.effectiveWaterMeters;
        ctx.clearRect(0, 0, 256, 256);
        if (waterLevel <= 0.1) return;

        const pixels = this.offscreenImageData.data;
        pixels.fill(0);

        for (let r = 0; r < GRID_RES; r++) {
            const rowOffset = r * GRID_RES;
            for (let c = 0; c < GRID_RES; c++) {
                const idx = rowOffset + c;
                const req = requiredLevelGrid[idx];
                if (waterLevel < req) continue;

                const depth = waterLevel - req;
                const pIdx = idx * 4;

                const isEdge =
                    (r > 0 && waterLevel < requiredLevelGrid[idx - GRID_RES]) ||
                    (r < GRID_RES - 1 && waterLevel < requiredLevelGrid[idx + GRID_RES]) ||
                    (c > 0 && waterLevel < requiredLevelGrid[idx - 1]) ||
                    (c < GRID_RES - 1 && waterLevel < requiredLevelGrid[idx + 1]);

                if (isEdge) {
                    pixels[pIdx] = 29;
                    pixels[pIdx + 1] = 58;
                    pixels[pIdx + 2] = 158;
                    pixels[pIdx + 3] = 235;
                } else if (depth > 3.5) {
                    pixels[pIdx] = 42;
                    pixels[pIdx + 1] = 78;
                    pixels[pIdx + 2] = 232;
                    pixels[pIdx + 3] = 185;
                } else {
                    pixels[pIdx] = 67;
                    pixels[pIdx + 1] = 104;
                    pixels[pIdx + 2] = 245;
                    pixels[pIdx + 3] = 155;
                }
            }
        }

        this.offscreenCtx.putImageData(this.offscreenImageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreenCanvas, 0, 0, 256, 256);
    }

    private tileCoordsToKey(coords: L.Coords): string {
        return `${coords.z}:${coords.x}:${coords.y}`;
    }
}

export function FloodSimulationLayer({
                                         hydroMesh,
                                         isLoadingData,
                                         selectedStation,
                                         stationCoordinates,
                                         simulatedLevel,
                                         impactedStreets,
                                         inspectedDiagnostic,
                                         onSelectStreet,
                                     }: FloodSimulationLayerProps) {
    const map = useMap();
    const gridLayerRef = useRef<TopographicFloodGridLayer | null>(null);

    const effectiveWaterRise = computeEffectiveWaterRiseMeters(
        simulatedLevel,
        selectedStation
    );

    useEffect(() => {
        const gridLayer = new TopographicFloodGridLayer({
            tileSize: 256,
            opacity: 1,
            zIndex: 420,
            updateWhenIdle: false,
        });
        gridLayer.addTo(map);
        gridLayerRef.current = gridLayer;

        return () => {
            map.removeLayer(gridLayer);
            gridLayerRef.current = null;
        };
    }, [map]);

    useEffect(() => {
        gridLayerRef.current?.setHydrologyMesh(hydroMesh);
    }, [hydroMesh]);

    useEffect(() => {
        gridLayerRef.current?.setEffectiveWaterMeters(effectiveWaterRise);
    }, [effectiveWaterRise, hydroMesh]);

    const mainRiverSegments = useMemo<HydroWaterwaySegment[]>(
        () => hydroMesh?.segments.filter((s) => s.kind === 'river') ?? [],
        [hydroMesh]
    );

    const selectedStreetId = inspectedDiagnostic?.street.id ?? null;

    return (
        <>
            {isLoadingData && (
                <div className="hg-sim-loading-pill" role="status">
                    <span className="hg-sim-loading-dot" />
                    <span>Calculando malha topográfica e cotas das vias...</span>
                </div>
            )}

            {mainRiverSegments.map((seg) => (
                <Polyline
                    key={seg.id}
                    positions={seg.points}
                    pathOptions={{
                        color: '#1d4ed8',
                        weight: 3,
                        opacity: 0.75,
                    }}
                />
            ))}

            {impactedStreets.map((item) => {
                const isSelected = item.street.id === selectedStreetId;
                const strokeColor = isSelected
                    ? '#ffffff'
                    : STREET_SEVERITY_COLOR[item.severity];

                return item.street.polylines.map((poly, idx) => (
                    <Polyline
                        key={`${item.street.id}-${idx}`}
                        positions={poly}
                        pathOptions={{
                            color: strokeColor,
                            weight: isSelected ? 6 : 4,
                            opacity: isSelected ? 1 : 0.88,
                        }}
                        eventHandlers={{
                            click: () =>
                                onSelectStreet(item.street.id, item.street.focusPoint),
                        }}
                    >
                        <Tooltip sticky>
                            <strong>{item.street.name}</strong> • Lâmina: +
                            {item.waterDepthMeters.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            m (Inunda aos{' '}
                            {item.triggerQuotaMeters.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                            })}
                            m)
                        </Tooltip>
                    </Polyline>
                ));
            })}

            {inspectedDiagnostic &&
                !inspectedDiagnostic.isFlooded &&
                inspectedDiagnostic.street.polylines.map((poly, idx) => (
                    <Polyline
                        key={`safe-inspected-${inspectedDiagnostic.street.id}-${idx}`}
                        positions={poly}
                        pathOptions={{
                            color: '#10b981',
                            weight: 6,
                            opacity: 0.95,
                        }}
                    />
                ))}

            {inspectedDiagnostic && (
                <CircleMarker
                    center={inspectedDiagnostic.street.focusPoint}
                    radius={9}
                    pathOptions={{
                        color: '#0f172a',
                        weight: 3,
                        fillColor:
                            inspectedDiagnostic.severity === 'SAFE'
                                ? '#10b981'
                                : STREET_SEVERITY_COLOR[inspectedDiagnostic.severity],
                        fillOpacity: 1,
                    }}
                >
                    <Tooltip direction="top" offset={[0, -10]} permanent>
                        <strong>{inspectedDiagnostic.street.name}</strong> •{' '}
                        {inspectedDiagnostic.isFlooded
                            ? `Alagada (+${inspectedDiagnostic.waterDepthMeters.toLocaleString(
                                'pt-BR',
                                {
                                    minimumFractionDigits: 2,
                                }
                            )}m)`
                            : `Segura (Alaga aos ${inspectedDiagnostic.triggerQuotaMeters.toLocaleString(
                                'pt-BR',
                                {
                                    minimumFractionDigits: 1,
                                }
                            )}m)`}
                    </Tooltip>
                </CircleMarker>
            )}

            <CircleMarker
                center={stationCoordinates}
                radius={11}
                pathOptions={{
                    color: '#ffffff',
                    weight: 3,
                    fillColor: '#9333ea',
                    fillOpacity: 1,
                }}
            >
                <Tooltip direction="top" offset={[0, -10]} permanent>
                    <strong>Régua Ativa: {selectedStation.stationName}</strong> (
                    {simulatedLevel.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                    })}
                    m)
                </Tooltip>
            </CircleMarker>
        </>
    );
}