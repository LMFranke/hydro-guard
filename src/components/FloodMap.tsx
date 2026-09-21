import { useState, useEffect } from 'react';
import {MapContainer, TileLayer, Circle, Popup, useMap} from 'react-leaflet';
import { AlertTriangle, Waves, Mountain } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './FloodMap.css';

export type MapLayer = 'FLOOD' | 'LANDSLIDE';
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskZone {
    id: string;
    name: string;
    coordinates: [number, number];
    radius: number; // em metros
    level: RiskLevel;
    description: string;
}

function MapResizer() {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => clearTimeout(timer);
    }, [map]);

    return null;
}

export function FloodMap() {
    const [activeLayer, setActiveLayer] = useState<MapLayer>('FLOOD');
    const cityCenter: [number, number] = [-26.923, -49.366];

    const floodZones: RiskZone[] = [
        { id: 'f1', name: 'Portal Rodeio', coordinates: [-26.940288891715177, -49.368609159227354], radius: 100, level: 'HIGH', description: 'Histórico de inundação rápida pelo Rio Benedito.' },
        { id: 'f2', name: 'Bairro Glória', coordinates: [-26.93529514119753, -49.37040264871344], radius: 100, level: 'MEDIUM', description: 'Cota de inundação atinge vias principais.' },
        { id: 'f3', name: 'Rua Luiz Pisetta', coordinates: [-26.91997101682467, -49.368742908571505], radius: 200, level: 'MEDIUM', description: 'Histórico de inundação rápida.' },
        { id: 'f4', name: 'Rua Lucínio Cristofoline', coordinates: [-26.932278316143297, -49.36981530579197], radius: 50, level: 'LOW', description: 'Histórico de fortes enxurradas .' },
        { id: 'f5', name: 'Rua Roberto Tambosi', coordinates: [-26.929897048162328, -49.3740019663946], radius: 75, level: 'MEDIUM', description: 'Histórico de inundação rápida.' }
    ];

    const landslideZones: RiskZone[] = [
        { id: 'l1', name: 'Morro do Ipiranga', coordinates: [-26.905, -49.370], radius: 400, level: 'HIGH', description: 'Solo saturado. Risco iminente de deslizamento de terra.' },
        { id: 'l2', name: 'Encosta Bairro Nova', coordinates: [-26.940, -49.355], radius: 350, level: 'MEDIUM', description: 'Área com histórico de rolamento de blocos.' },
        { id: 'l3', name: 'Encosta Bairro Nova', coordinates: [-26.926625628658382, -49.36417167034003], radius: 150, level: 'MEDIUM', description: 'Área com histórico com quedas de terra e árvores.' },
    ];

    const getRiskColor = (level: RiskLevel, layer: MapLayer) => {
        if (layer === 'FLOOD') {
            return level === 'HIGH' ? '#3b82f6' : level === 'MEDIUM' ? '#60a5fa' : '#93c5fd';
        } else {
            return level === 'HIGH' ? '#ef4444' : level === 'MEDIUM' ? '#f97316' : '#fcd34d';
        }
    };

    const activeData = activeLayer === 'FLOOD' ? floodZones : landslideZones;

    return (
        <section className="map-section" aria-labelledby="map-title">
            <header className="map-header">
                <h2 id="map-title" className="section-title">Mapeamento de Áreas de Risco</h2>
                <p className="section-subtitle">Visualização por satélite de pontos críticos em Rodeio/SC.</p>
            </header>

            <div className="map-wrapper">
                { }
                <MapContainer
                    center={cityCenter}
                    zoom={14}
                    scrollWheelZoom={true}
                    className="leaflet-container"
                >
                    <MapResizer />
                    { }
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    { }
                    {activeData.map((zone) => (
                        <Circle
                            key={zone.id}
                            center={zone.coordinates}
                            radius={zone.radius}
                            pathOptions={{
                                color: getRiskColor(zone.level, activeLayer),
                                fillColor: getRiskColor(zone.level, activeLayer),
                                fillOpacity: 0.5,
                                weight: 2
                            }}
                        >
                            <Popup>
                                <div className="map-popup">
                                    <strong>{zone.name}</strong>
                                    <span className={`popup-badge risk-${zone.level.toLowerCase()}`}>
                    Risco {zone.level === 'HIGH' ? 'Alto' : zone.level === 'MEDIUM' ? 'Médio' : 'Baixo'}
                  </span>
                                    <p>{zone.description}</p>
                                </div>
                            </Popup>
                        </Circle>
                    ))}
                </MapContainer>

                { }
                <div className="map-overlay-legend">
                    <div className="legend-header">
                        <AlertTriangle size={16} />
                        <span>LEGENDA</span>
                    </div>
                    <div className="legend-body">
                        <div className="legend-item">
                            <span className="legend-color" style={{ backgroundColor: activeLayer === 'FLOOD' ? '#3b82f6' : '#ef4444' }}></span>
                            <span>Risco Alto</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ backgroundColor: activeLayer === 'FLOOD' ? '#60a5fa' : '#f97316' }}></span>
                            <span>Risco Médio</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ backgroundColor: activeLayer === 'FLOOD' ? '#93c5fd' : '#fcd34d' }}></span>
                            <span>Risco Baixo</span>
                        </div>
                    </div>
                </div>

                { }
                <div className="map-overlay-controls">
                    <div className="controls-group">
                        <button
                            className={`control-btn ${activeLayer === 'FLOOD' ? 'active-flood' : ''}`}
                            onClick={() => setActiveLayer('FLOOD')}
                        >
                            <Waves size={18} />
                            Pontos de Alagamentos
                        </button>
                        <button
                            className={`control-btn ${activeLayer === 'LANDSLIDE' ? 'active-landslide' : ''}`}
                            onClick={() => setActiveLayer('LANDSLIDE')}
                        >
                            <Mountain size={18} />
                            Áreas de Desabamentos
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}