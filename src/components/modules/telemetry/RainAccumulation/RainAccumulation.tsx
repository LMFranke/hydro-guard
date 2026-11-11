import { CloudRain } from 'lucide-react';
import type { RainGaugeData } from '../../../../types';
import { Badge } from '../../../ui';
import './RainAccumulation.css';

interface RainAccumulationProps {
    data: RainGaugeData;
}

export function RainAccumulation({ data }: RainAccumulationProps) {
    return (
        <section className="hg-rain-section" aria-labelledby="rain-title">
            <header className="hg-rain-header">
                <div className="hg-rain-title-group">
                    <CloudRain size={24} className="hg-rain-icon" strokeWidth={2.5} />
                    <h2 id="rain-title" className="hg-section-title">
                        Chuva Acumulada
                    </h2>
                </div>

                <Badge variant={data.isRainingNow ? 'below' : 'neutral'}>
                    {data.isRainingNow ? 'Chovendo Agora' : 'Sem Chuva Agora'}
                </Badge>
            </header>

            <p className="hg-rain-station">Pluviômetro: {data.stationName}</p>

            <div className="hg-tubes-container">
                {data.measurements.map((measurement) => {
                    const fillPercentage = Math.min(
                        (measurement.value / data.maxScale) * 100,
                        100
                    );

                    return (
                        <div key={measurement.periodLabel} className="hg-tube-wrapper">
                            <div className="hg-tube">
                                <div className="hg-tick-mark" style={{ bottom: '25%' }} />
                                <div className="hg-tick-mark" style={{ bottom: '50%' }} />
                                <div className="hg-tick-mark" style={{ bottom: '75%' }} />
                                <div
                                    className="hg-tube-fill"
                                    style={{
                                        height: `${fillPercentage}%`,
                                        borderRadius: fillPercentage >= 98 ? '24px' : '0 0 24px 24px',
                                    }}
                                />
                            </div>

                            <div className="hg-tube-labels">
                <span className="hg-tube-value">
                  {measurement.value.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                  })}
                    <span className="unit">mm</span>
                </span>
                                <span className="hg-tube-period">{measurement.periodLabel}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <footer className="hg-rain-footer">
                <p>
                    Escala das provetas: 0 a {data.maxScale} mm. Última hora fechada:{' '}
                    {data.lastUpdated}.
                </p>
            </footer>
        </section>
    );
}