import { useEffect, useRef } from 'react';
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

const GRID_RES = 128;
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
    private mesh: CityHydrologyMesh | null = null;
    private effectiveWaterMeters = 2.5;

    public setHydrologyMesh(mesh: CityHydrologyMesh | null) {
        this.mesh = mesh;
        this.preparedTiles.clear();
        this.redraw();
    }

    public setEffectiveWaterMeters(waterMeters: number) {
        this.effectiveWaterMeters = waterMeters;
        for (const tileData of this.preparedTiles.values()) {
            this.paintTileCanvas(tileData);
        }
    }

    protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        canvas.className = 'hg-sim-canvas-tile';

        const tileKey = this.tileCoordsToKey(coords);

        void this.buildTileElevationModel(coords, canvas).then((prepared) => {
            if (prepared) {
                this.preparedTiles.set(tileKey, prepared);
                this.paintTileCanvas(prepared);
            }
            done(undefined, canvas);
        });

        this.on('tileunload', (e: L.TileEvent) => {
            const unloadedKey = this.tileCoordsToKey(e.coords);
            this.preparedTiles.delete(unloadedKey);
        });

        return canvas;
    }

    private async buildTileElevationModel(
        coords: L.Coords,
        canvas: HTMLCanvasElement
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
        if (!demElevations) return null;

        const subOffsetX = (coords.x % scale) * (256 / scale);
        const subOffsetY = (coords.y % scale) * (256 / scale);
        const subSize = 256 / scale;

        const [centerLat, centerLng] = tileXYToLatLng(
            coords.x + 0.5,
            coords.y + 0.5,
            coords.z
        );
        const cosLat = Math.cos((centerLat * Math.PI) / 180);

        const localPoints: Array<{
            lat: number;
            lng: number;
            isMainRiver: boolean;
            channelWidth: number;
        }> = [];

        for (const seg of this.mesh.segments) {
            const isMain = seg.kind === 'river';
            for (const [ptLat, ptLng] of seg.points) {
                if (
                    Math.abs(ptLat - centerLat) < 0.045 &&
                    Math.abs(ptLng - centerLng) < 0.055
                ) {
                    localPoints.push({
                        lat: ptLat,
                        lng: ptLng,
                        isMainRiver: isMain,
                        channelWidth: seg.channelWidthMeters,
                    });
                }
            }
        }

        const requiredLevelGrid = new Float32Array(GRID_RES * GRID_RES);
        requiredLevelGrid.fill(999);

        if (localPoints.length === 0) {
            return { canvas, requiredLevelGrid };
        }

        const terrainGrid = new Float32Array(GRID_RES * GRID_RES);
        let minRiverChannelElevation = Infinity;

        for (let r = 0; r < GRID_RES; r++) {
            const demRow = Math.min(
                255,
                Math.floor(subOffsetY + ((r + 0.5) / GRID_RES) * subSize)
            );
            for (let c = 0; c < GRID_RES; c++) {
                const demCol = Math.min(
                    255,
                    Math.floor(subOffsetX + ((c + 0.5) / GRID_RES) * subSize)
                );
                terrainGrid[r * GRID_RES + c] = demElevations[demRow * 256 + demCol];
            }
        }

        const distGrid = new Float32Array(GRID_RES * GRID_RES);
        const channelWidthGrid = new Float32Array(GRID_RES * GRID_RES);
        const isMainRiverGrid = new Uint8Array(GRID_RES * GRID_RES);

        for (let r = 0; r < GRID_RES; r++) {
            const fracY = coords.y + (r + 0.5) / GRID_RES;
            const n = Math.PI - (2 * Math.PI * fracY) / Math.pow(2, coords.z);
            const lat =
                (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

            for (let c = 0; c < GRID_RES; c++) {
                const fracX = coords.x + (c + 0.5) / GRID_RES;
                const lng = (fracX / Math.pow(2, coords.z)) * 360 - 180;

                let minDistSq = Infinity;
                let nearestWidth = 20;
                let nearestMain = 0;

                for (let i = 0; i < localPoints.length; i++) {
                    const lp = localPoints[i];
                    const dy = (lat - lp.lat) * 111320;
                    const dx = (lng - lp.lng) * 111320 * cosLat;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        nearestWidth = lp.channelWidth;
                        nearestMain = lp.isMainRiver ? 1 : 0;
                    }
                }

                const idx = r * GRID_RES + c;
                const distMeters = Math.sqrt(minDistSq);
                distGrid[idx] = distMeters;
                channelWidthGrid[idx] = nearestWidth;
                isMainRiverGrid[idx] = nearestMain;

                if (distMeters <= nearestWidth * 1.5) {
                    const z = terrainGrid[idx];
                    if (z < minRiverChannelElevation) {
                        minRiverChannelElevation = z;
                    }
                }
            }
        }

        if (!Number.isFinite(minRiverChannelElevation)) {
            for (let i = 0; i < terrainGrid.length; i++) {
                if (terrainGrid[i] < minRiverChannelElevation) {
                    minRiverChannelElevation = terrainGrid[i];
                }
            }
        }

        for (let i = 0; i < GRID_RES * GRID_RES; i++) {
            const dist = distGrid[i];
            const channelW = channelWidthGrid[i];
            const isMain = isMainRiverGrid[i] === 1;
            const maxFloodplainReach = isMain ? 2200 : 750;

            if (dist > maxFloodplainReach) {
                requiredLevelGrid[i] = 999;
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

        return { canvas, requiredLevelGrid };
    }

    private paintTileCanvas(tileData: PreparedTileData) {
        const { canvas, requiredLevelGrid } = tileData;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const waterLevel = this.effectiveWaterMeters;
        ctx.clearRect(0, 0, 256, 256);

        if (waterLevel <= 0.1) return;

        const offscreen = document.createElement('canvas');
        offscreen.width = GRID_RES;
        offscreen.height = GRID_RES;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        const imgData = offCtx.createImageData(GRID_RES, GRID_RES);
        const pixels = imgData.data;

        for (let r = 0; r < GRID_RES; r++) {
            for (let c = 0; c < GRID_RES; c++) {
                const idx = r * GRID_RES + c;
                const req = requiredLevelGrid[idx];

                if (waterLevel < req) continue;

                const depth = waterLevel - req;
                const pIdx = idx * 4;

                const isEdge =
                    (r > 0 && waterLevel < requiredLevelGrid[(r - 1) * GRID_RES + c]) ||
                    (r < GRID_RES - 1 &&
                        waterLevel < requiredLevelGrid[(r + 1) * GRID_RES + c]) ||
                    (c > 0 && waterLevel < requiredLevelGrid[r * GRID_RES + (c - 1)]) ||
                    (c < GRID_RES - 1 &&
                        waterLevel < requiredLevelGrid[r * GRID_RES + (c + 1)]);

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

        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(offscreen, 0, 0, 256, 256);
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

    const mainRiverSegments: HydroWaterwaySegment[] =
        hydroMesh?.segments.filter((s) => s.kind === 'river') ?? [];

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