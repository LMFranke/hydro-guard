import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { MapPin, Maximize2, Minimize2, Plus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { ENV } from '../../../../config/env';
import { useAuth, useMonitoring, useTenant } from '../../../../contexts';
import {
    evaluateImpactedStreets,
    fetchCitySimulationDataset,
    inspectStreetAtQuota,
    type CitySimulationDataset,
} from '../../../../services';
import type {
    MapLayer,
    MapViewMode,
    RiskZone,
    RiskZoneInput,
} from '../../../../types';
import {
    buildSimulationStationProfiles,
    evaluateSimulationQuota,
} from '../../../../utils';
import { Button } from '../../../ui';
import { ImpactedStreetsPanel } from './components/ImpactedStreetsPanel';
import {
    MapClickHandler,
    MapStreetFocusController,
    MapViewportSync,
} from './components/MapControllers';
import { MapLayerControls } from './components/MapLayerControls';
import { MapLegend } from './components/MapLegend';
import { RiskZoneModal } from './components/RiskZoneModal';
import { SimulationControlBar } from './components/SimulationControlBar';
import { StreetQuotaSearch } from './components/StreetQuotaSearch';
import { FloodSimulationLayer } from './layers/FloodSimulationLayer';
import { FloodZonesLayer } from './layers/FloodZonesLayer';
import { LandslideZonesLayer } from './layers/LandslideZonesLayer';
import { TelemetryStationsLayer } from './layers/TelemetryStationsLayer';
import './FloodMap.css';

export function FloodMap() {
    const { tenant, citySlug, coordinates, cityDisplayName } = useTenant();
    const { isCoordinator } = useAuth();
    const {
        rivers,
        historyData,
        riskZones,
        stationMarkers,
        addRiskZone,
        editRiskZone,
        removeRiskZone,
    } = useMonitoring();

    const simulationStations = useMemo(
        () =>
            buildSimulationStationProfiles(
                rivers,
                historyData,
                stationMarkers,
                coordinates,
                tenant?.name ?? cityDisplayName
            ),
        [rivers, historyData, stationMarkers, coordinates, tenant?.name, cityDisplayName]
    );

    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [activeMode, setActiveMode] = useState<MapViewMode>('FLOOD');

    const selectedStation = useMemo(
        () =>
            simulationStations.find((s) => s.stationId === selectedStationId) ??
            simulationStations[0],
        [simulationStations, selectedStationId]
    );

    const [simulatedLevel, setSimulatedLevel] = useState<number>(
        () => selectedStation.currentLevel
    );
    const [simulationDataset, setSimulationDataset] =
        useState<CitySimulationDataset | null>(null);
    const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);
    const [focusedStreetCoords, setFocusedStreetCoords] = useState<
        [number, number] | null
    >(null);

    const [showStations, setShowStations] = useState<boolean>(true);
    const [isMaximized, setIsMaximized] = useState<boolean>(false);
    const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);

    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingZone, setEditingZone] = useState<RiskZone | null>(null);
    const [pickedCoords, setPickedCoords] = useState<[number, number] | null>(
        null
    );

    const activeQuotaBracket = useMemo(
        () => evaluateSimulationQuota(simulatedLevel, selectedStation.brackets),
        [simulatedLevel, selectedStation.brackets]
    );

    const activeMapCenter = useMemo<[number, number]>(() => {
        if (activeMode === 'SIMULATION') {
            return selectedStation.coordinates;
        }
        return coordinates;
    }, [activeMode, selectedStation.coordinates, coordinates]);

    useEffect(() => {
        if (activeMode !== 'SIMULATION') return;
        if (simulationDataset?.citySlug === citySlug) return;

        let isMounted = true;

        async function loadSimulationData() {
            const dataset = await fetchCitySimulationDataset(citySlug, coordinates);
            if (!isMounted) return;
            setSimulationDataset(dataset);
        }

        void loadSimulationData();

        return () => {
            isMounted = false;
        };
    }, [activeMode, citySlug, coordinates, simulationDataset?.citySlug]);

    const currentCityStreets = useMemo(
        () =>
            simulationDataset?.citySlug === citySlug ? simulationDataset.streets : [],
        [simulationDataset, citySlug]
    );

    const currentHydroMesh = useMemo(
        () =>
            simulationDataset?.citySlug === citySlug
                ? simulationDataset.hydroMesh
                : null,
        [simulationDataset, citySlug]
    );

    const isLoadingSimulationData =
        activeMode === 'SIMULATION' && simulationDataset?.citySlug !== citySlug;

    const impactedStreets = useMemo(
        () =>
            evaluateImpactedStreets(
                currentCityStreets,
                selectedStation,
                simulatedLevel
            ),
        [currentCityStreets, selectedStation, simulatedLevel]
    );

    const inspectedDiagnostic = useMemo(() => {
        if (!selectedStreetId) return null;
        const found = currentCityStreets.find((s) => s.id === selectedStreetId);
        if (!found) return null;
        return inspectStreetAtQuota(found, selectedStation, simulatedLevel);
    }, [selectedStreetId, currentCityStreets, selectedStation, simulatedLevel]);

    useEffect(() => {
        if (!isMaximized) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !showModal) {
                if (isPickingLocation) {
                    setIsPickingLocation(false);
                } else {
                    setIsMaximized(false);
                }
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMaximized, showModal, isPickingLocation]);

    const { floodCount, landslideCount } = useMemo(() => {
        let flood = 0;
        let landslide = 0;
        for (const zone of riskZones) {
            if (zone.zoneType === 'FLOOD') flood += 1;
            else if (zone.zoneType === 'LANDSLIDE') landslide += 1;
        }
        return { floodCount: flood, landslideCount: landslide };
    }, [riskZones]);

    const handleSelectMode = (mode: MapViewMode) => {
        if (mode === 'SIMULATION' && activeMode !== 'SIMULATION') {
            setSimulatedLevel(selectedStation.currentLevel);
            setSelectedStreetId(null);
            setFocusedStreetCoords(null);
            setIsPickingLocation(false);
        }
        setActiveMode(mode);
    };

    const handleSelectSimulationStation = (newStationId: string) => {
        setSelectedStationId(newStationId);
        setSelectedStreetId(null);
        setFocusedStreetCoords(null);
        const target = simulationStations.find((s) => s.stationId === newStationId);
        if (target) {
            setSimulatedLevel(target.currentLevel);
        }
    };

    const handleFocusStreet = (streetId: string, coords: [number, number]) => {
        setSelectedStreetId(streetId);
        setFocusedStreetCoords([coords[0], coords[1]]);
    };

    const handleClearStreetSelection = () => {
        setSelectedStreetId(null);
        setFocusedStreetCoords(null);
    };

    const openCreateModal = (coords?: [number, number]) => {
        setEditingZone(null);
        setPickedCoords(coords ?? null);
        setIsPickingLocation(false);
        setShowModal(true);
    };

    const openEditModal = (zone: RiskZone) => {
        setEditingZone(zone);
        setPickedCoords(null);
        setIsPickingLocation(false);
        setShowModal(true);
    };

    const handleMapClick = (lat: number, lng: number) => {
        openCreateModal([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
    };

    const handleSaveZone = async (
        payload: RiskZoneInput,
        editingId: string | null
    ) => {
        if (editingId) {
            const updated = await editRiskZone(editingId, payload);
            setActiveMode(updated.zoneType);
        } else {
            const created = await addRiskZone(payload);
            setActiveMode(created.zoneType);
        }
        setShowModal(false);
    };

    const handleDeleteZone = async (id: string) => {
        if (!window.confirm('Deseja realmente remover esta área de risco?')) return;
        await removeRiskZone(id);
    };

    const defaultModalLayer: MapLayer =
        activeMode === 'LANDSLIDE' ? 'LANDSLIDE' : 'FLOOD';

    return (
        <section
            className={`hg-surface-section hg-map-section ${
                isMaximized ? 'is-maximized' : ''
            }`}
            aria-labelledby="map-title"
        >
            <header className="hg-section-header">
                <div>
                    <h2 id="map-title" className="hg-section-title">
                        Mapeamento de Áreas de Risco e Simulador de Cotas
                    </h2>
                    {!isMaximized && (
                        <p className="hg-section-subtitle">
                            Visualização por satélite de pontos críticos, sensores da ANA e
                            simulação de inundação em {cityDisplayName}.
                        </p>
                    )}
                </div>

                {isCoordinator && activeMode !== 'SIMULATION' && (
                    <div className="hg-map-actions">
                        <Button
                            variant={isPickingLocation ? 'success' : 'dark'}
                            leftIcon={<MapPin size={18} />}
                            onClick={() => setIsPickingLocation((prev) => !prev)}
                        >
                            {isPickingLocation
                                ? 'Clique no Mapa para Marcar...'
                                : 'Marcar Ponto no Mapa'}
                        </Button>

                        <Button
                            variant="primary"
                            leftIcon={<Plus size={18} />}
                            onClick={() => openCreateModal()}
                        >
                            Nova Área de Risco
                        </Button>
                    </div>
                )}
            </header>

            <div
                className={`hg-map-wrapper ${isPickingLocation ? 'picking-mode' : ''}`}
            >
                {activeMode === 'SIMULATION' && (
                    <>
                        <SimulationControlBar
                            stations={simulationStations}
                            selectedStation={selectedStation}
                            simulatedLevel={simulatedLevel}
                            activeBracket={activeQuotaBracket}
                            onSelectStation={handleSelectSimulationStation}
                            onChangeLevel={setSimulatedLevel}
                            onResetToRealLevel={() =>
                                setSimulatedLevel(selectedStation.currentLevel)
                            }
                        />

                        <div className="hg-sim-right-dock">
                            <StreetQuotaSearch
                                cityName={tenant?.name ?? cityDisplayName}
                                streets={currentCityStreets}
                                selectedStation={selectedStation}
                                simulatedLevel={simulatedLevel}
                                inspectedDiagnostic={inspectedDiagnostic}
                                onSelectStreet={handleFocusStreet}
                                onClearSelection={handleClearStreetSelection}
                                onJumpToQuota={setSimulatedLevel}
                            />

                            <ImpactedStreetsPanel
                                impactedStreets={impactedStreets}
                                totalCatalogCount={currentCityStreets.length}
                                simulatedLevel={simulatedLevel}
                                selectedStreetId={selectedStreetId}
                                isLoading={isLoadingSimulationData}
                                onSelectStreet={handleFocusStreet}
                            />
                        </div>
                    </>
                )}

                <MapContainer
                    center={activeMapCenter}
                    zoom={14}
                    scrollWheelZoom={true}
                    className="hg-leaflet-container"
                >
                    <MapViewportSync center={activeMapCenter} isMaximized={isMaximized} />
                    <MapStreetFocusController targetCoords={focusedStreetCoords} />
                    <MapClickHandler
                        enabled={
                            isCoordinator && isPickingLocation && activeMode !== 'SIMULATION'
                        }
                        onMapClick={handleMapClick}
                    />

                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url={ENV.ARCGIS_TILE_URL}
                    />

                    {activeMode === 'FLOOD' && (
                        <FloodZonesLayer
                            zones={riskZones}
                            isCoordinator={isCoordinator}
                            onEdit={openEditModal}
                            onDelete={handleDeleteZone}
                        />
                    )}

                    {activeMode === 'LANDSLIDE' && (
                        <LandslideZonesLayer
                            zones={riskZones}
                            isCoordinator={isCoordinator}
                            onEdit={openEditModal}
                            onDelete={handleDeleteZone}
                        />
                    )}

                    {activeMode === 'SIMULATION' && (
                        <>
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                                opacity={0.75}
                            />
                            <FloodSimulationLayer
                                hydroMesh={currentHydroMesh}
                                isLoadingData={isLoadingSimulationData}
                                selectedStation={selectedStation}
                                stationCoordinates={activeMapCenter}
                                simulatedLevel={simulatedLevel}
                                impactedStreets={impactedStreets}
                                inspectedDiagnostic={inspectedDiagnostic}
                                onSelectStreet={handleFocusStreet}
                            />
                        </>
                    )}

                    {showStations && (
                        <TelemetryStationsLayer stations={stationMarkers} />
                    )}
                </MapContainer>

                <button
                    type="button"
                    className="hg-map-fullscreen-fab"
                    onClick={() => setIsMaximized((prev) => !prev)}
                    title={isMaximized ? 'Reduzir Mapa (Esc)' : 'Expandir Mapa'}
                    aria-label={
                        isMaximized ? 'Reduzir Mapa' : 'Expandir Mapa em Tela Cheia'
                    }
                >
                    {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <MapLegend
                    activeMode={activeMode}
                    showStations={showStations}
                    quotaBrackets={selectedStation.brackets}
                    activeQuotaStatus={activeQuotaBracket.status}
                />

                <MapLayerControls
                    activeMode={activeMode}
                    onSelectMode={handleSelectMode}
                    showStations={showStations}
                    onToggleStations={() => setShowStations((prev) => !prev)}
                    floodCount={floodCount}
                    landslideCount={landslideCount}
                    stationsCount={stationMarkers.length}
                />
            </div>

            <RiskZoneModal
                isOpen={showModal}
                editingZone={editingZone}
                defaultCoordinates={pickedCoords ?? coordinates}
                defaultLayer={defaultModalLayer}
                onClose={() => setShowModal(false)}
                onSubmitZone={handleSaveZone}
            />
        </section>
    );
}