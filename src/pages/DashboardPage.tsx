import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
    RainAccumulation,
    RiverCard,
    RiverChart,
} from '../components/modules';
import { useMonitoring, useTenant } from '../contexts';
import './Pages.css';

export function DashboardPage() {
    const { cityDisplayName } = useTenant();
    const { rivers, historyData, rainData, isLoadingTelemetry } = useMonitoring();

    const carouselRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        updateScrollButtons();
        window.addEventListener('resize', updateScrollButtons);
        return () => window.removeEventListener('resize', updateScrollButtons);
    }, [rivers, updateScrollButtons]);

    const handleScroll = (direction: 'left' | 'right') => {
        const el = carouselRef.current;
        if (!el) return;
        const scrollStep = el.clientWidth * 0.85;
        el.scrollBy({
            left: direction === 'left' ? -scrollStep : scrollStep,
            behavior: 'smooth',
        });
    };

    const useTwoRows = rivers.length > 4;
    const showCarouselButtons = canScrollLeft || canScrollRight;

    if (isLoadingTelemetry && rivers.length === 0) {
        return (
            <div className="hg-page-status-box" role="status" aria-live="polite">
                <Loader2 size={32} className="hg-spinner-icon" />
                <h3>Sincronizando Telemetria Hidrológica</h3>
                <p>
                    Obtendo leituras das estações da ANA para {cityDisplayName}...
                </p>
            </div>
        );
    }

    return (
        <>
            <section
                className="hg-rivers-section"
                aria-labelledby="rivers-section-title"
            >
                <div className="hg-rivers-section-header">
                    <div className="hg-rivers-title-wrap">
                        <h2 id="rivers-section-title" className="hg-section-title">
                            Nível dos Rios em Tempo Real
                        </h2>
                        {rivers.length > 0 && (
                            <span className="hg-rivers-count-badge">
                {rivers.length} estações
              </span>
                        )}
                    </div>

                    {showCarouselButtons && (
                        <div className="hg-rivers-carousel-controls">
                            <button
                                type="button"
                                className="hg-carousel-nav-btn"
                                onClick={() => handleScroll('left')}
                                disabled={!canScrollLeft}
                                title="Ver estações anteriores"
                                aria-label="Ver estações anteriores"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                type="button"
                                className="hg-carousel-nav-btn"
                                onClick={() => handleScroll('right')}
                                disabled={!canScrollRight}
                                title="Ver mais estações à direita"
                                aria-label="Ver mais estações à direita"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>

                <div
                    ref={carouselRef}
                    onScroll={updateScrollButtons}
                    className={`hg-rivers-carousel ${useTwoRows ? 'is-two-rows' : ''}`}
                >
                    {rivers.map((river) => (
                        <RiverCard key={river.id} data={river} />
                    ))}
                </div>
            </section>

            <RiverChart data={historyData} />

            {rainData && <RainAccumulation data={rainData} />}
        </>
    );
}