import { Map as MapIcon } from 'lucide-react';
import './WindyMap.css';

export function WindyMap() {
    return (
        <section className="windy-section" aria-labelledby="windy-title">
            <header className="windy-header">
                <div className="windy-title-group">
                    <MapIcon size={24} className="text-blue-500" />
                    <h2 id="windy-title" className="section-title">Radar Meteorológico em Tempo Real</h2>
                </div>
                <p className="section-subtitle">Acompanhe a movimentação de nuvens, chuvas e tempestades via satélite.</p>
            </header>

            <div className="iframe-container">
                <iframe
                    width="100%"
                    height="550"
                    src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=10&overlay=rain&product=ecmwf&level=surface&lat=-26.923&lon=-49.366"
                    frameBorder="0"
                    title="Radar de Chuva Windy - Rodeio SC"
                    allowFullScreen
                ></iframe>
            </div>
        </section>
    );
}