import { Mountain, Radio, Waves } from 'lucide-react';
import type { MapLayer } from '../../../../../types';

interface MapLayerControlsProps {
    activeLayer: MapLayer;
    onSelectLayer: (layer: MapLayer) => void;
    showStations: boolean;
    onToggleStations: () => void;
    floodCount: number;
    landslideCount: number;
    stationsCount: number;
}

export function MapLayerControls({
                                     activeLayer,
                                     onSelectLayer,
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
                        activeLayer === 'FLOOD' ? 'active-flood' : ''
                    }`}
                    onClick={() => onSelectLayer('FLOOD')}
                >
                    <Waves size={18} />
                    <span>Inundações ({floodCount})</span>
                </button>

                <button
                    type="button"
                    className={`hg-layer-btn ${
                        activeLayer === 'LANDSLIDE' ? 'active-landslide' : ''
                    }`}
                    onClick={() => onSelectLayer('LANDSLIDE')}
                >
                    <Mountain size={18} />
                    <span>Desabamentos ({landslideCount})</span>
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