import { Gauge, RotateCcw } from 'lucide-react';
import type {
    SimulationQuotaBracket,
    SimulationStationProfile,
} from '../../../../../types';

interface SimulationControlBarProps {
    stations: SimulationStationProfile[];
    selectedStation: SimulationStationProfile;
    simulatedLevel: number;
    activeBracket: SimulationQuotaBracket;
    onSelectStation: (stationId: string) => void;
    onChangeLevel: (newLevel: number) => void;
    onResetToRealLevel: () => void;
}

export function SimulationControlBar({
                                         stations,
                                         selectedStation,
                                         simulatedLevel,
                                         activeBracket,
                                         onSelectStation,
                                         onChangeLevel,
                                         onResetToRealLevel,
                                     }: SimulationControlBarProps) {
    const { minScaleMeters, maxScaleMeters, currentLevel } = selectedStation;
    const scaleSpan = Math.max(1, maxScaleMeters - minScaleMeters);

    const clampLevel = (val: number): number => {
        if (Number.isNaN(val)) return minScaleMeters;
        return Math.min(
            maxScaleMeters,
            Math.max(minScaleMeters, Math.round(val * 10) / 10)
        );
    };

    const progressPercentage = Math.min(
        100,
        Math.max(0, ((simulatedLevel - minScaleMeters) / scaleSpan) * 100)
    );

    const deltaMeters = Number((simulatedLevel - currentLevel).toFixed(2));
    const isAtCurrentLevel = Math.abs(deltaMeters) < 0.05;

    const tickMarks = [
        minScaleMeters,
        minScaleMeters + scaleSpan * 0.25,
        minScaleMeters + scaleSpan * 0.5,
        minScaleMeters + scaleSpan * 0.75,
        maxScaleMeters,
    ].map((val) =>
        val.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    );

    return (
        <div
            className="hg-sim-control-bar"
            role="region"
            aria-label="Controle de Simulação de Cota de Inundação"
        >
            <div className="hg-sim-bar-top">
                <div className="hg-sim-station-selector-group">
          <span className="hg-sim-station-icon">
            <Gauge size={16} />
          </span>

                    <div className="hg-sim-station-select-wrap">
                        <div className="hg-sim-station-tooltip" role="tooltip">
                            {selectedStation.displayLabel}
                        </div>

                        <select
                            className="hg-sim-station-select"
                            value={selectedStation.stationId}
                            onChange={(e) => onSelectStation(e.target.value)}
                            title={selectedStation.displayLabel}
                            aria-label="Selecionar rio e estação de referência para simulação"
                        >
                            {stations.map((st) => (
                                <option key={st.stationId} value={st.stationId}>
                                    {st.displayLabel}
                                </option>
                            ))}
                        </select>

                        <span className="hg-sim-station-sub">
              Nível real agora:{' '}
                            <strong>
                {currentLevel.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
                                m
              </strong>{' '}
                            • Alerta Máx:{' '}
                            {selectedStation.thresholds.emergency.toLocaleString('pt-BR', {
                                maximumFractionDigits: 2,
                            })}
                            m
            </span>
                    </div>
                </div>

                <div className="hg-sim-status-group">
          <span className="hg-sim-delta-tag">
            {isAtCurrentLevel
                ? 'Sincronizado com nível atual'
                : deltaMeters > 0
                    ? `+${deltaMeters.toLocaleString('pt-BR')}m acima do atual`
                    : `${deltaMeters.toLocaleString('pt-BR')}m abaixo do atual`}
          </span>

                    <span
                        className="hg-sim-quota-badge"
                        style={{ backgroundColor: activeBracket.color }}
                    >
            {activeBracket.label}
          </span>
                </div>
            </div>

            <div className="hg-sim-controls-row">
                <label htmlFor="hg-sim-range-input" className="hg-sim-level-label">
                    Nível (metros):
                </label>

                <div className="hg-sim-slider-container">
                    <input
                        id="hg-sim-range-input"
                        type="range"
                        min={minScaleMeters}
                        max={maxScaleMeters}
                        step={0.1}
                        value={simulatedLevel}
                        onChange={(e) =>
                            onChangeLevel(clampLevel(parseFloat(e.target.value)))
                        }
                        className="hg-sim-range-slider"
                        style={{
                            background: `linear-gradient(to right, ${activeBracket.color} 0%, ${activeBracket.color} ${progressPercentage}%, #334155 ${progressPercentage}%, #334155 100%)`,
                        }}
                    />
                    <div className="hg-sim-slider-ticks">
                        {tickMarks.map((tick, idx) => (
                            <span key={idx}>{tick}m</span>
                        ))}
                    </div>
                </div>

                <div className="hg-sim-number-field">
                    <input
                        type="number"
                        min={minScaleMeters}
                        max={maxScaleMeters}
                        step={0.1}
                        value={simulatedLevel}
                        onChange={(e) =>
                            onChangeLevel(clampLevel(parseFloat(e.target.value)))
                        }
                        aria-label="Valor numérico da cota simulada em metros"
                    />
                    <span className="hg-sim-unit">m</span>
                </div>

                <button
                    type="button"
                    className={`hg-sim-current-btn ${isAtCurrentLevel ? 'is-synced' : ''}`}
                    onClick={onResetToRealLevel}
                    title="Voltar para o nível real medido agora pela ANA nesta estação"
                >
                    <RotateCcw size={14} />
                    <span>Nível Atual</span>
                </button>
            </div>
        </div>
    );
}