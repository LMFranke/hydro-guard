import { AlertTriangle, Waves } from 'lucide-react';
import type {
    MapViewMode,
    SimulationQuotaBracket,
    SimulationQuotaStatus,
} from '../../../../../types';
import { getRiskZoneColor, RISK_LEVEL_LABELS } from '../../../../../utils';

interface MapLegendProps {
    activeMode: MapViewMode;
    showStations: boolean;
    quotaBrackets?: SimulationQuotaBracket[];
    activeQuotaStatus?: SimulationQuotaStatus;
}

export function MapLegend({
                              activeMode,
                              showStations,
                              quotaBrackets = [],
                              activeQuotaStatus,
                          }: MapLegendProps) {
    const isSimulation = activeMode === 'SIMULATION';

    return (
        <div
            className={`hg-map-overlay-legend ${
                isSimulation ? 'is-simulation-legend' : ''
            }`}
        >
            <div className="hg-legend-header">
                {isSimulation ? <Waves size={16} /> : <AlertTriangle size={16} />}
                <span>{isSimulation ? 'COTAS DE INUNDAÇÃO' : 'LEGENDA'}</span>
            </div>

            <div className="hg-legend-body">
                {isSimulation
                    ? quotaBrackets.map((bracket) => {
                        const isCurrent = bracket.status === activeQuotaStatus;
                        return (
                            <div
                                key={bracket.status}
                                className={`hg-legend-item ${
                                    isCurrent ? 'is-active-bracket' : ''
                                }`}
                            >
                  <span
                      className="hg-legend-color hg-legend-dot-round"
                      style={{ backgroundColor: bracket.color }}
                  />
                                <div className="hg-legend-quota-text">
                                    <strong>{bracket.label}</strong>
                                    <span>({bracket.rangeText})</span>
                                </div>
                            </div>
                        );
                    })
                    : (['HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
                        <div key={lvl} className="hg-legend-item">
                <span
                    className="hg-legend-color"
                    style={{
                        backgroundColor: getRiskZoneColor(lvl, activeMode),
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