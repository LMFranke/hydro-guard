import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { MapPin, Maximize2, Minimize2, Plus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { ENV } from '../../../../config/env';
import { useAuth, useMonitoring, useTenant } from '../../../../contexts';
import type { MapLayer, RiskZone, RiskZoneInput } from '../../../../types';
import { Button } from '../../../ui';
import {
    MapClickHandler,
    MapViewportSync,
} from './components/MapControllers';
import { MapLayerControls } from './components/MapLayerControls';
import { MapLegend } from './components/MapLegend';
import { RiskZoneModal } from './components/RiskZoneModal';
import { FloodZonesLayer } from './layers/FloodZonesLayer';
import { LandslideZonesLayer } from './layers/LandslideZonesLayer';
import { TelemetryStationsLayer } from './layers/TelemetryStationsLayer';
import './FloodMap.css';

export function FloodMap() {
    const { coordinates, cityDisplayName } = useTenant();
    const { isCoordinator } = useAuth();
    const {
        riskZones,
        stationMarkers,
        addRiskZone,
        editRiskZone,
        removeRiskZone,
    } = useMonitoring();

    const [activeLayer, setActiveLayer] = useState<MapLayer>('FLOOD');
    const [showStations, setShowStations] = useState<boolean>(true);
    const [isMaximized, setIsMaximized] = useState<boolean>(false);
    const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);

    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingZone, setEditingZone] = useState<RiskZone | null>(null);
    const [pickedCoords, setPickedCoords] = useState<[number, number] | null>(
        null
    );

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
            setActiveLayer(updated.zoneType);
        } else {
            const created = await addRiskZone(payload);
            setActiveLayer(created.zoneType);
        }
        setShowModal(false);
    };

    const handleDeleteZone = async (id: string) => {
        if (!window.confirm('Deseja realmente remover esta área de risco?')) return;
        await removeRiskZone(id);
    };

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
                        Mapeamento de Áreas de Risco e Sensores
                    </h2>
                    {!isMaximized && (
                        <p className="hg-section-subtitle">
                            Visualização por satélite de pontos críticos e estações da ANA em{' '}
                            {cityDisplayName}.
                        </p>
                    )}
                </div>

                {isCoordinator && (
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
                <MapContainer
                    center={coordinates}
                    zoom={14}
                    scrollWheelZoom={true}
                    className="hg-leaflet-container"
                >
                    <MapViewportSync center={coordinates} isMaximized={isMaximized} />
                    <MapClickHandler
                        enabled={isCoordinator && isPickingLocation}
                        onMapClick={handleMapClick}
                    />

                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url={ENV.ARCGIS_TILE_URL}
                    />

                    {activeLayer === 'FLOOD' ? (
                        <FloodZonesLayer
                            zones={riskZones}
                            isCoordinator={isCoordinator}
                            onEdit={openEditModal}
                            onDelete={handleDeleteZone}
                        />
                    ) : (
                        <LandslideZonesLayer
                            zones={riskZones}
                            isCoordinator={isCoordinator}
                            onEdit={openEditModal}
                            onDelete={handleDeleteZone}
                        />
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

                <MapLegend activeLayer={activeLayer} showStations={showStations} />

                <MapLayerControls
                    activeLayer={activeLayer}
                    onSelectLayer={setActiveLayer}
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
                defaultLayer={activeLayer}
                onClose={() => setShowModal(false)}
                onSubmitZone={handleSaveZone}
            />
        </section>
    );
}