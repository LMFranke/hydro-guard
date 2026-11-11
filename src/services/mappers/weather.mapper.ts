import type { DailyForecast, OpenMeteoDailyResponse } from '../../types';
import {
    evaluateForecastSeverity,
    getTodayIsoDate,
    mapWmoToWeatherType,
    parseIsoDateToForecastMeta,
} from '../../utils';

export function mapOpenMeteoToDailyForecast(
    data: OpenMeteoDailyResponse
): DailyForecast[] {
    const todayIso = getTodayIsoDate();

    return data.daily.time.map((isoDate, index) => {
        const { formattedDate, dayOfWeek } = parseIsoDateToForecastMeta(isoDate);
        const rainVolume =
            Math.round((data.daily.precipitation_sum[index] ?? 0) * 10) / 10;
        const rainProbability = data.daily.precipitation_probability_max[index] ?? 0;
        const wmoCode = data.daily.weather_code[index] ?? 0;

        return {
            id: isoDate,
            date: formattedDate,
            dayOfWeek,
            weatherType: mapWmoToWeatherType(wmoCode),
            minTemp: Math.round(data.daily.temperature_2m_min[index] ?? 0),
            maxTemp: Math.round(data.daily.temperature_2m_max[index] ?? 0),
            rainProbability,
            rainVolume,
            alertSeverity: evaluateForecastSeverity(rainVolume),
            isPast: isoDate < todayIso,
            isToday: isoDate === todayIso,
        };
    });
}