import { useState, useMemo, useRef, useEffect } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Gauge,
    MapPin,
    Search,
    X,
} from 'lucide-react';
import { searchCityStreetsCatalog } from '../../../../../services';
import type {
    SimulatedStreetSegment,
    SimulationStationProfile,
    StreetQuotaDiagnostic,
} from '../../../../../types';

interface StreetQuotaSearchProps {
    cityName: string;
    streets: SimulatedStreetSegment[];
    selectedStation: SimulationStationProfile;
    simulatedLevel: number;
    inspectedDiagnostic: StreetQuotaDiagnostic | null;
    onSelectStreet: (streetId: string, coords: [number, number]) => void;
    onClearSelection: () => void;
    onJumpToQuota: (quotaMeters: number) => void;
}

export function StreetQuotaSearch({
                                      cityName,
                                      streets,
                                      selectedStation,
                                      simulatedLevel,
                                      inspectedDiagnostic,
                                      onSelectStreet,
                                      onClearSelection,
                                      onJumpToQuota,
                                  }: StreetQuotaSearchProps) {
    const [query, setQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const searchResults = useMemo(
        () =>
            searchCityStreetsCatalog(
                streets,
                query,
                selectedStation,
                simulatedLevel,
                8
            ),
        [streets, query, selectedStation, simulatedLevel]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePickResult = (diag: StreetQuotaDiagnostic) => {
        setQuery(diag.street.name);
        setIsDropdownOpen(false);
        onSelectStreet(diag.street.id, diag.street.focusPoint);
    };

    const handleClearInput = () => {
        setQuery('');
        setIsDropdownOpen(false);
        onClearSelection();
    };

    return (
        <div ref={containerRef} className="hg-sim-search-container">
            <div className="hg-sim-search-input-box">
                <Search size={15} className="hg-sim-search-icon" />
                <input
                    type="text"
                    className="hg-sim-search-input"
                    placeholder={`Digite uma rua de ${cityName}...`}
                    value={query}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsDropdownOpen(true);
                    }}
                    aria-label={`Pesquisar cota de inundação de uma rua em ${cityName}`}
                />
                {(query || inspectedDiagnostic) && (
                    <button
                        type="button"
                        className="hg-sim-search-clear-btn"
                        onClick={handleClearInput}
                        title="Limpar pesquisa"
                        aria-label="Limpar pesquisa de rua"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Lista de sugestões (Autocomplete) */}
            {isDropdownOpen && query.trim().length > 0 && (
                <div className="hg-sim-search-dropdown" role="listbox">
                    {searchResults.length === 0 ? (
                        <div className="hg-sim-search-no-results">
                            Nenhuma via mapeada encontrada para &ldquo;{query}&rdquo;.
                        </div>
                    ) : (
                        searchResults.map((diag) => (
                            <button
                                key={diag.street.id}
                                type="button"
                                className="hg-sim-search-option"
                                onClick={() => handlePickResult(diag)}
                            >
                                <div className="hg-sim-search-option-main">
                                    <strong>{diag.street.name}</strong>
                                    <span>
                    {diag.street.neighborhood
                        ? `${diag.street.neighborhood} • `
                        : ''}
                                        Cota crítica:{' '}
                                        {diag.triggerQuotaMeters.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                        })}
                                        m
                  </span>
                                </div>

                                <span
                                    className={`hg-sim-search-status-tag ${diag.severity.toLowerCase()}`}
                                >
                  {diag.isFlooded
                      ? `+${diag.waterDepthMeters.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                      })}m`
                      : 'Segura'}
                </span>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Card de Diagnóstico da Rua Selecionada */}
            {inspectedDiagnostic && (
                <div
                    className={`hg-sim-street-diagnostic-card is-${inspectedDiagnostic.severity.toLowerCase()}`}
                >
                    <div className="hg-sim-diag-header">
                        <div className="hg-sim-diag-title-wrap">
                            {inspectedDiagnostic.isFlooded ? (
                                <AlertTriangle size={16} className="diag-icon-flooded" />
                            ) : (
                                <CheckCircle2 size={16} className="diag-icon-safe" />
                            )}
                            <div>
                                <h4>{inspectedDiagnostic.street.name}</h4>
                                <span>
                  <MapPin size={11} />
                                    {inspectedDiagnostic.street.neighborhood ?? 'Zona Urbana'} •{' '}
                                    {inspectedDiagnostic.street.distanceToRiverMeters}m do rio
                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="hg-sim-diag-close"
                            onClick={onClearSelection}
                            title="Fechar diagnóstico da via"
                            aria-label="Fechar diagnóstico da via"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="hg-sim-diag-metrics">
                        <div className="hg-sim-diag-metric-box">
                            <span>Cota de Alagamento</span>
                            <strong>
                                {inspectedDiagnostic.triggerQuotaMeters.toLocaleString(
                                    'pt-BR',
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    }
                                )}
                                m
                            </strong>
                        </div>

                        <div className="hg-sim-diag-metric-box">
              <span>
                {inspectedDiagnostic.isFlooded
                    ? 'Lâmina na Via Agora'
                    : 'Margem de Segurança'}
              </span>
                            <strong
                                className={
                                    inspectedDiagnostic.isFlooded ? 'text-danger' : 'text-safe'
                                }
                            >
                                {inspectedDiagnostic.isFlooded
                                    ? `+${inspectedDiagnostic.waterDepthMeters.toLocaleString(
                                        'pt-BR',
                                        {
                                            minimumFractionDigits: 2,
                                        }
                                    )}m (Alagada)`
                                    : `${inspectedDiagnostic.safetyMarginMeters.toLocaleString(
                                        'pt-BR',
                                        {
                                            minimumFractionDigits: 2,
                                        }
                                    )}m livre`}
                            </strong>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="hg-sim-diag-jump-btn"
                        onClick={() =>
                            onJumpToQuota(inspectedDiagnostic.triggerQuotaMeters)
                        }
                    >
                        <Gauge size={13} />
                        <span>
              Simular Cota desta Via (
                            {inspectedDiagnostic.triggerQuotaMeters.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                            })}
                            m)
            </span>
                    </button>
                </div>
            )}
        </div>
    );
}