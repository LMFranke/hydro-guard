import { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    MapPin,
    Navigation,
} from 'lucide-react';
import type {
    ImpactedStreetEvaluation,
    StreetFloodSeverity,
} from '../../../../../types';

interface ImpactedStreetsPanelProps {
    impactedStreets: ImpactedStreetEvaluation[];
    totalCatalogCount: number;
    simulatedLevel: number;
    selectedStreetId: string | null;
    isLoading: boolean;
    onSelectStreet: (streetId: string, coords: [number, number]) => void;
}

const SEVERITY_META: Record<
    StreetFloodSeverity,
    { label: string; cssClass: string }
> = {
    CRITICAL: { label: 'Submersão Severa', cssClass: 'critical' },
    WARNING: { label: 'Alagada', cssClass: 'warning' },
    WATCH: { label: 'Lâmina Rasa', cssClass: 'watch' },
};

export function ImpactedStreetsPanel({
                                         impactedStreets,
                                         totalCatalogCount,
                                         simulatedLevel,
                                         selectedStreetId,
                                         isLoading,
                                         onSelectStreet,
                                     }: ImpactedStreetsPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const criticalCount = impactedStreets.filter(
        (s) => s.severity === 'CRITICAL'
    ).length;
    const warningCount = impactedStreets.filter(
        (s) => s.severity === 'WARNING'
    ).length;

    return (
        <aside
            className={`hg-sim-streets-panel ${isCollapsed ? 'is-collapsed' : ''}`}
            aria-label="Vias Atingidas na Cota Simulada"
        >
            <header className="hg-sim-streets-header">
                <div className="hg-sim-streets-title-group">
                    <AlertTriangle
                        size={16}
                        className={
                            impactedStreets.length > 0 ? 'icon-alert' : 'icon-safe'
                        }
                    />
                    <div>
                        <h3>Vias Atingidas</h3>
                        <span>
              Cota simulada:{' '}
                            <strong>
                {simulatedLevel.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                })}
                                m
              </strong>
            </span>
                    </div>
                </div>

                <div className="hg-sim-streets-header-right">
          <span
              className={`hg-sim-streets-count-pill ${
                  impactedStreets.length > 0 ? 'has-impact' : ''
              }`}
          >
            {impactedStreets.length} / {totalCatalogCount || '...'}
          </span>

                    <button
                        type="button"
                        className="hg-sim-collapse-btn"
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        title={isCollapsed ? 'Expandir lista de ruas' : 'Recolher painel'}
                        aria-label={
                            isCollapsed ? 'Expandir lista de ruas' : 'Recolher painel'
                        }
                    >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                </div>
            </header>

            {!isCollapsed && (
                <div className="hg-sim-streets-body">
                    {impactedStreets.length > 0 && (
                        <div className="hg-sim-streets-summary">
              <span className="hg-sim-summary-chip critical">
                {criticalCount} Crítica(s) (&ge;1m)
              </span>
                            <span className="hg-sim-summary-chip warning">
                {warningCount} Moderada(s)
              </span>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="hg-sim-streets-empty">
                            <p>Mapeando altimetria das vias do município...</p>
                        </div>
                    ) : impactedStreets.length === 0 ? (
                        <div className="hg-sim-streets-empty">
                            <CheckCircle2 size={28} className="hg-sim-safe-icon" />
                            <strong>Nenhuma via alagada nesta cota</strong>
                            <p>
                                Aumente o nível no controle deslizante para simular o avanço da
                                água sobre as ruas.
                            </p>
                        </div>
                    ) : (
                        <ul className="hg-sim-streets-list">
                            {impactedStreets.map((item) => {
                                const { street, triggerQuotaMeters, waterDepthMeters, severity } =
                                    item;
                                const sevMeta = SEVERITY_META[severity];
                                const isSelected = street.id === selectedStreetId;

                                return (
                                    <li key={street.id}>
                                        <button
                                            type="button"
                                            className={`hg-sim-street-item ${
                                                isSelected ? 'is-selected' : ''
                                            } border-${sevMeta.cssClass}`}
                                            onClick={() =>
                                                onSelectStreet(street.id, street.focusPoint)
                                            }
                                        >
                                            <div className="hg-sim-street-main">
                                                <strong className="hg-sim-street-name">
                                                    {street.name}
                                                </strong>
                                                <span className="hg-sim-street-meta">
                          <MapPin size={11} />
                                                    {street.neighborhood
                                                        ? `${street.neighborhood} • `
                                                        : ''}
                                                    Inunda aos{' '}
                                                    {triggerQuotaMeters.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 1,
                                                        maximumFractionDigits: 1,
                                                    })}
                                                    m
                        </span>
                                            </div>

                                            <div className="hg-sim-street-metrics">
                        <span
                            className={`hg-sim-depth-badge ${sevMeta.cssClass}`}
                        >
                          +{waterDepthMeters.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                            m
                        </span>
                                                <span className="hg-sim-focus-hint">
                          <Navigation size={10} /> Focar
                        </span>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </aside>
    );
}