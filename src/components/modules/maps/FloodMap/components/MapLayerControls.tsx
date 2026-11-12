import { Gauge, Mountain, Radio, Waves } from 'lucide-react';
import type { MapViewMode } from '../../../../../types';

interface MapLayerControlsProps {
    activeMode: MapViewMode;
    onSelectMode: (mode: MapViewMode) => void;
    showStations: boolean;
    onToggleStations: () => void;
    floodCount: number;
    landslideCount: number;
    stationsCount: number;
}

export function MapLayerControls({
                                     activeMode,
                                     onSelectMode,
                                     showStations,
                                     onToggleStations,
                                     floodCount,
                                     landslideCount,
                                     stationsCount,
                                 }: MapLayerControlsProps) {
    return (
        <div className="hg-map-overlay-controls">
            <div className="hg-controls-group">
                <button
                    type="button"
                    className={`hg-layer-btn ${
                        activeMode === 'FLOOD' ? 'active-flood' : ''
                    }`}
                    onClick={() => onSelectMode('FLOOD')}
                >
                    <Waves size={18} />
                    <span>Inundações ({floodCount})</span>
                </button>

                <button
                    type="button"
                    className={`hg-layer-btn ${
                        activeMode === 'LANDSLIDE' ? 'active-landslide' : ''
                    }`}
                    onClick={() => onSelectMode('LANDSLIDE')}
                >
                    <Mountain size={18} />
                    <span>Desabamentos ({landslideCount})</span>
                </button>

                <button
                    type="button"
                    className={`hg-layer-btn ${
                        activeMode === 'SIMULATION' ? 'active-simulation' : ''
                    }`}
                    onClick={() => onSelectMode('SIMULATION')}
                >
                    <Gauge size={18} />
                    <span>Simulador de Cota</span>
                </button>

                <button
                    type="button"
                    className={`hg-layer-btn ${showStations ? 'active-stations' : ''}`}
                    onClick={onToggleStations}
                >
                    <Radio size={18} />
                    <span>Estações ({stationsCount})</span>
                </button>
            </div>
        </div>
    );
}