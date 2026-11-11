import { useState, useEffect } from 'react';
import { Map as MapIcon, Maximize2, Minimize2 } from 'lucide-react';
import { ENV } from '../../../../config/env';
import { useTenant } from '../../../../contexts';
import { Button } from '../../../ui';
import './WindyMap.css';

export function WindyMap() {
    const { coordinates, cityDisplayName } = useTenant();
    const [lat, lng] = coordinates;
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!isMaximized) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMaximized(false);
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMaximized]);

    const params = new URLSearchParams({
        type: 'map',
        location: 'coordinates',
        metricRain: 'mm',
        metricTemp: '°C',
        metricWind: 'km/h',
        zoom: '11',
        overlay: 'rain',
        product: 'ecmwf',
        level: 'surface',
        lat: String(lat),
        lon: String(lng),
    });

    const embedUrl = `${ENV.WINDY_EMBED_BASE_URL}?${params.toString()}`;

    return (
        <section
            className={`hg-surface-section hg-windy-section ${
                isMaximized ? 'is-maximized' : ''
            }`}
            aria-labelledby="windy-title"
        >
            <header className="hg-section-header">
                <div>
                    <div className="hg-windy-title-group">
                        <MapIcon size={24} className="hg-windy-icon" />
                        <h2 id="windy-title" className="hg-section-title">
                            Radar Meteorológico em Tempo Real
                        </h2>
                    </div>
                    {!isMaximized && (
                        <p className="hg-section-subtitle">
                            Acompanhe a movimentação de nuvens, chuvas e tempestades via
                            satélite em {cityDisplayName}.
                        </p>
                    )}
                </div>

                <Button
                    variant={isMaximized ? 'dark' : 'outline'}
                    leftIcon={
                        isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />
                    }
                    onClick={() => setIsMaximized((prev) => !prev)}
                    title={
                        isMaximized
                            ? 'Sair da tela cheia (Esc)'
                            : 'Expandir radar para tela cheia'
                    }
                >
                    {isMaximized ? 'Reduzir Mapa (Esc)' : 'Expandir Mapa'}
                </Button>
            </header>

            <div className="hg-iframe-container">
                <iframe
                    className="hg-windy-iframe"
                    src={embedUrl}
                    title={`Radar de Chuva Windy - ${cityDisplayName}`}
                    allowFullScreen
                />
            </div>
        </section>
    );
}