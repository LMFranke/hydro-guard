import { Sun, CloudSun, CloudRain, CloudLightning } from 'lucide-react';
import './WeatherForecast.css';

export type WeatherType = 'SUNNY' | 'PARTLY_CLOUDY' | 'RAINY' | 'STORMY';
export type AlertSeverity = 'NORMAL' | 'WATCH' | 'WARNING' | 'DANGER';

export interface DailyForecast {
    id: string;
    date: string;
    dayOfWeek: string;
    weatherType: WeatherType;
    minTemp: number;
    maxTemp: number;
    rainProbability: number;
    rainVolume: number;
    alertSeverity: AlertSeverity;
    isPast?: boolean;
    isToday?: boolean;
}

interface WeatherForecastProps {
    forecastData: DailyForecast[];
}

export function WeatherForecast({ forecastData }: WeatherForecastProps) {

    const renderWeatherIcon = (type: WeatherType) => {
        switch (type) {
            case 'SUNNY': return <Sun size={36} className="text-yellow-500" />;
            case 'PARTLY_CLOUDY': return <CloudSun size={36} className="text-gray-400" />;
            case 'RAINY': return <CloudRain size={36} className="text-blue-500" />;
            case 'STORMY': return <CloudLightning size={36} className="text-indigo-600" />;
            default: return <Sun size={36} />;
        }
    };

    const alertLabels: Record<AlertSeverity, string> = {
        NORMAL: 'Sem Risco',
        WATCH: 'Atenção',
        WARNING: 'Alerta',
        DANGER: 'Emergência'
    };

    return (
        <section className="forecast-section" aria-labelledby="forecast-title">
            <header className="forecast-header">
                <h2 id="forecast-title" className="section-title">Previsão e Histórico (10 Dias)</h2>
                <p className="section-subtitle">Monitorização dos 3 dias anteriores e previsão para os próximos dias.</p>
            </header>

            <div className="forecast-grid">
                {forecastData.map((day) => {
                    const severityClass = day.alertSeverity.toLowerCase();

                    const cardClasses = [
                        'forecast-card',
                        `border-top-${severityClass}`,
                        day.isPast ? 'is-past' : '',
                        day.isToday ? 'is-today' : ''
                    ].filter(Boolean).join(' ');

                    return (
                        <article key={day.id} className={cardClasses}>
                            {day.isToday && <span className="today-label">HOJE</span>}

                            <header className="day-header">
                                <h3 className="day-name">{day.dayOfWeek}</h3>
                                <time className="day-date" dateTime={day.date}>{day.date}</time>
                            </header>

                            <div className="weather-icon-wrapper">
                                {renderWeatherIcon(day.weatherType)}
                            </div>

                            <div className="temperature-group">
                                <span className="temp-max" title="Temperatura Máxima">{day.maxTemp}°</span>
                                <span className="temp-divider">/</span>
                                <span className="temp-min" title="Temperatura Mínima">{day.minTemp}°</span>
                            </div>

                            <div className="rain-details">
                                <div className="rain-stat">
                                    <span className="stat-label">Chuva:</span>
                                    <span className="stat-value">{day.rainVolume} mm</span>
                                </div>
                                <div className="rain-stat">
                                    <span className="stat-label">Chance:</span>
                                    <span className="stat-value">{day.rainProbability}%</span>
                                </div>
                            </div>

                            <footer className="day-footer">
                <span className={`severity-badge badge-${severityClass}`}>
                  {alertLabels[day.alertSeverity]}
                </span>
                            </footer>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}