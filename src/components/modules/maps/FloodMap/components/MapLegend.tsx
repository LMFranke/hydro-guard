import { AlertTriangle } from 'lucide-react';
import type { MapLayer } from '../../../../../types';
import { getRiskZoneColor, RISK_LEVEL_LABELS } from '../../../../../utils';

interface MapLegendProps {
    activeLayer: MapLayer;
    showStations: boolean;
}

export function MapLegend({ activeLayer, showStations }: MapLegendProps) {
    return (
        <div className="hg-map-overlay-legend">
            <div className="hg-legend-header">
                <AlertTriangle size={16} />
                <span>LEGENDA</span>
            </div>
            <div className="hg-legend-body">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
                    <div key={lvl} className="hg-legend-item">
            <span
                className="hg-legend-color"
                style={{
                    backgroundColor: getRiskZoneColor(lvl, activeLayer),
                }}
            />
                        <span>Risco {RISK_LEVEL_LABELS[lvl]}</span>
                    </div>
                ))}
                {showStations && (
                    <div className="hg-legend-item">
                        <span className="hg-legend-station-dot" />
                        <span>Estação ANA</span>
                    </div>
                )}
            </div>
        </div>
    );
}