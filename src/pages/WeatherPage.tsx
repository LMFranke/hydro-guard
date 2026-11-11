import { Loader2 } from 'lucide-react';
import { WeatherForecast, WindyMap } from '../components/modules';
import { useMonitoring, useTenant } from '../contexts';
import './Pages.css';

export function WeatherPage() {
    const { cityDisplayName } = useTenant();
    const { forecastData, isLoadingForecast } = useMonitoring();

    return (
        <>
            {isLoadingForecast && forecastData.length === 0 ? (
                <div className="hg-page-status-box" role="status" aria-live="polite">
                    <Loader2 size={32} className="hg-spinner-icon" />
                    <h3>Carregando Previsão Meteorológica</h3>
                    <p>Obtendo modelos climáticos para {cityDisplayName}...</p>
                </div>
            ) : (
                <WeatherForecast forecastData={forecastData} />
            )}

            <WindyMap />
        </>
    );
}