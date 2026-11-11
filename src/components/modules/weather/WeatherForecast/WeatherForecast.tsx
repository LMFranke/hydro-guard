import { CloudLightning, CloudRain, CloudSun, Sun } from 'lucide-react';
import type { DailyForecast, WeatherType } from '../../../../types';
import { FORECAST_SEVERITY_LABELS } from '../../../../utils';
import { Badge, type BadgeVariant } from '../../../ui';
import './WeatherForecast.css';

interface WeatherForecastProps {
    forecastData: DailyForecast[];
}

function renderWeatherIcon(type: WeatherType) {
    switch (type) {
        case 'SUNNY':
            return <Sun size={36} className="hg-icon-sunny" />;
        case 'PARTLY_CLOUDY':
            return <CloudSun size={36} className="hg-icon-cloudy" />;
        case 'RAINY':
            return <CloudRain size={36} className="hg-icon-rainy" />;
        case 'STORMY':
            return <CloudLightning size={36} className="hg-icon-stormy" />;
    }
}

export function WeatherForecast({ forecastData }: WeatherForecastProps) {
    return (
        <section className="hg-surface-section" aria-labelledby="forecast-title">
            <header className="hg-section-header">
                <div>
                    <h2 id="forecast-title" className="hg-section-title">
                        Previsão e Histórico (10 Dias)
                    </h2>
                    <p className="hg-section-subtitle">
                        Monitorização dos 3 dias anteriores e previsão para os próximos 7
                        dias.
                    </p>
                </div>
            </header>

            <div className="hg-forecast-grid">
                {forecastData.map((day) => {
                    const severityKey = day.alertSeverity.toLowerCase() as BadgeVariant;
                    const cardClasses = [
                        'hg-forecast-card',
                        `border-top-${severityKey}`,
                        day.isPast ? 'is-past' : '',
                        day.isToday ? 'is-today' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <article key={day.id} className={cardClasses}>
                            {day.isToday && <span className="hg-today-label">HOJE</span>}

                            <header className="hg-day-header">
                                <h3 className="hg-day-name">{day.dayOfWeek}</h3>
                                <time className="hg-day-date" dateTime={day.id}>
                                    {day.date}
                                </time>
                            </header>

                            <div className="hg-weather-icon-wrapper">
                                {renderWeatherIcon(day.weatherType)}
                            </div>

                            <div className="hg-temperature-group">
                <span className="hg-temp-max" title="Temperatura Máxima">
                  {day.maxTemp}°
                </span>
                                <span className="hg-temp-divider">/</span>
                                <span className="hg-temp-min" title="Temperatura Mínima">
                  {day.minTemp}°
                </span>
                            </div>

                            <div className="hg-rain-details">
                                <div className="hg-rain-stat">
                                    <span className="hg-stat-label">Chuva:</span>
                                    <span className="hg-stat-value">{day.rainVolume} mm</span>
                                </div>
                                <div className="hg-rain-stat">
                                    <span className="hg-stat-label">Chance:</span>
                                    <span className="hg-stat-value">{day.rainProbability}%</span>
                                </div>
                            </div>

                            <footer className="hg-day-footer">
                                <Badge variant={severityKey} block>
                                    {FORECAST_SEVERITY_LABELS[day.alertSeverity]}
                                </Badge>
                            </footer>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}