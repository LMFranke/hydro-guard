import { APP_CONFIG, ENV } from '../config/env';
import type { DailyForecast, OpenMeteoDailyResponse } from '../types';
import { httpClient } from './httpClient';
import { mapOpenMeteoToDailyForecast } from './mappers';

export async function fetchWeatherForecast(
    lat: number,
    lng: number
): Promise<DailyForecast[]> {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'precipitation_probability_max',
        ].join(','),
        past_days: '3',
        forecast_days: '7',
        timezone: APP_CONFIG.DEFAULT_TIMEZONE,
    });

    const data = await httpClient.get<OpenMeteoDailyResponse>(
        `${ENV.OPEN_METEO_BASE_URL}?${params.toString()}`
    );

    return mapOpenMeteoToDailyForecast(data);
}