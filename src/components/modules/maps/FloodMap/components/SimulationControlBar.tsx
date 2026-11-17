import { Droplets, Info, RotateCcw } from 'lucide-react';
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
    onChangeLevel: (level: number) => void;
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
    const isAtRealLevel = Math.abs(simulatedLevel - currentLevel) < 0.05;
    const deltaMeters = simulatedLevel - currentLevel;

    const quarterMarks = [0, 0.25, 0.5, 0.75, 1].map((pct) =>
        Number((minScaleMeters + (maxScaleMeters - minScaleMeters) * pct).toFixed(1))
    );

    const sliderProgressPct = Math.min(
        100,
        Math.max(
            0,
            ((simulatedLevel - minScaleMeters) /
                Math.max(1, maxScaleMeters - minScaleMeters)) *
            100
        )
    );

    return (
        <div
            className="hg-sim-control-bar"
            role="region"
            aria-label="Controles da Simulação Ilustrativa de Cota"
        >
            <div className="hg-sim-disclaimer-banner">
                <Info size={14} />
                <span>
          <strong>SIMULAÇÃO TOPOGRÁFICA ILUSTRATIVA:</strong> Calculada via
          modelo HAND sobre relevo de satélite (AWS Terrarium DEM / SRTM 30m) e
          malha OpenStreetMap. Não constitui previsão hidrológica oficial
          validada.
        </span>
            </div>

            <div className="hg-sim-bar-top">
                <div className="hg-sim-station-selector-group">
                    <div className="hg-sim-station-icon">
                        <Droplets size={16} />
                    </div>

                    <div className="hg-sim-station-select-wrap">
                        <div className="hg-sim-station-tooltip">
                            {selectedStation.displayLabel}
                        </div>

                        <select
                            className="hg-sim-station-select"
                            value={selectedStation.stationId}
                            onChange={(e) => onSelectStation(e.target.value)}
                            aria-label="Selecionar estação de referência para simulação"
                        >
                            {stations.map((st) => (
                                <option key={st.stationId} value={st.stationId}>
                                    {st.displayLabel.toUpperCase()}
                                </option>
                            ))}
                        </select>

                        <span className="hg-sim-station-sub">
              Nível real agora (ANA):{' '}
                            <strong>
                {currentLevel.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                })}
                                m
              </strong>{' '}
                            • Alerta Máx: {selectedStation.thresholds.emergency}m
            </span>
                    </div>
                </div>

                <div className="hg-sim-status-group">
          <span className="hg-sim-delta-tag">
            {isAtRealLevel
                ? 'Sincronizado com nível atual'
                : `${deltaMeters > 0 ? '+' : ''}${deltaMeters.toLocaleString(
                    'pt-BR',
                    {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                    }
                )}m vs. atual`}
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
                <label htmlFor="hg-quota-slider" className="hg-sim-level-label">
                    Nível (metros):
                </label>

                <div className="hg-sim-slider-container">
                    <input
                        id="hg-quota-slider"
                        type="range"
                        min={minScaleMeters}
                        max={maxScaleMeters}
                        step={0.1}
                        value={simulatedLevel}
                        onChange={(e) => onChangeLevel(Number(e.target.value))}
                        className="hg-sim-range-slider"
                        style={{
                            background: `linear-gradient(to right, ${activeBracket.color} ${sliderProgressPct}%, #334155 ${sliderProgressPct}%)`,
                        }}
                    />

                    <div className="hg-sim-slider-ticks">
                        {quarterMarks.map((mark) => (
                            <span key={mark}>
                {mark.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}m
              </span>
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
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!Number.isNaN(val)) {
                                onChangeLevel(
                                    Math.min(maxScaleMeters, Math.max(minScaleMeters, val))
                                );
                            }
                        }}
                        aria-label="Nível simulado em metros"
                    />
                    <span className="hg-sim-unit">m</span>
                </div>

                <button
                    type="button"
                    className={`hg-sim-current-btn ${isAtRealLevel ? 'is-synced' : ''}`}
                    onClick={onResetToRealLevel}
                    disabled={isAtRealLevel}
                    title="Voltar o simulador para a leitura real da estação agora"
                >
                    <RotateCcw size={13} />
                    <span>Nível Atual</span>
                </button>
            </div>
        </div>
    );
}