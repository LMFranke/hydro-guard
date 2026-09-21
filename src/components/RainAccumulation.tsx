import { CloudRain } from 'lucide-react';
import './RainAccumulation.css';

export interface RainMeasurement {
    periodLabel: string;
    value: number;
}

export interface RainGaugeData {
    stationName: string;
    isRainingNow: boolean;
    lastUpdated: string;
    maxScale: number;
    measurements: RainMeasurement[];
}

interface RainAccumulationProps {
    data: RainGaugeData;
}

export function RainAccumulation({ data }: RainAccumulationProps) {
    return (
        <section className="rain-section" aria-labelledby="rain-title">
            <header className="rain-header">
                <div className="rain-title-group">
                    <CloudRain size={24} className="rain-icon" strokeWidth={2.5} />
                    <h2 id="rain-title" className="rain-title">Chuva Acumulada</h2>
                </div>
                <span className={`rain-status-badge ${data.isRainingNow ? 'raining' : 'not-raining'}`}>
          {data.isRainingNow ? 'CHUVENDO AGORA' : 'SEM CHUVA AGORA'}
        </span>
            </header>

            <p className="rain-station">Pluviômetro: {data.stationName}</p>

            <div className="tubes-container">
                {data.measurements.map((measurement, index) => {
                    const fillPercentage = Math.min((measurement.value / data.maxScale) * 100, 100);

                    return (
                        <div key={index} className="tube-wrapper">
                            <div className="tube">
                                <div className="tick-mark" style={{ bottom: '25%' }}></div>
                                <div className="tick-mark" style={{ bottom: '50%' }}></div>
                                <div className="tick-mark" style={{ bottom: '75%' }}></div>

                                <div
                                    className="tube-fill"
                                    style={{ height: `${fillPercentage}%` }}
                                ></div>
                            </div>
                            <div className="tube-labels">
                <span className="tube-value">
                  {measurement.value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="unit">mm</span>
                </span>
                                <span className="tube-period">{measurement.periodLabel}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <footer className="rain-footer">
                <p>Escala das provetas: 0–{data.maxScale} mm. Última hora fechada: {data.lastUpdated}.</p>
            </footer>
        </section>
    );
}