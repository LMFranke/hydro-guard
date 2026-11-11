export type WeatherType = 'SUNNY' | 'PARTLY_CLOUDY' | 'RAINY' | 'STORMY';
export type ForecastSeverity = 'NORMAL' | 'WATCH' | 'WARNING' | 'DANGER';

export interface OpenMeteoDailyResponse {
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        precipitation_probability_max: number[];
    };
}

export interface DailyForecast {
    id: string;
    date: string;
    dayOfWeek: string;
    weatherType: WeatherType;
    minTemp: number;
    maxTemp: number;
    rainProbability: number;
    rainVolume: number;
    alertSeverity: ForecastSeverity;
    isPast: boolean;
    isToday: boolean;
}