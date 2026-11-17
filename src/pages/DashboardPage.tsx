import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    Loader2,
    MapPin,
    RefreshCw,
    ShieldAlert,
    WifiOff,
} from 'lucide-react';
import {
    RainAccumulation,
    RiverCard,
    RiverChart,
} from '../components/modules';
import { Button } from '../components/ui';
import { useMonitoring, useTenant } from '../contexts';
import { OFFICIAL_ALERT_SEVERITY_LABELS } from '../utils';
import './Pages.css';

export function DashboardPage() {
    const { citySlug, cityDisplayName } = useTenant();
    const {
        rivers,
        historyData,
        rainData,
        alerts,
        systemHealth,
        isLoadingTelemetry,
        lastUpdatedAt,
        checkSystemHealthNow,
    } = useMonitoring();

    const carouselRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

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

    const handleRetrySync = async () => {
        setIsRetrying(true);
        try {
            await checkSystemHealthNow();
        } finally {
            setIsRetrying(false);
        }
    };

    const useTwoRows = rivers.length > 4;
    const showCarouselButtons = canScrollLeft || canScrollRight;
    const primaryActiveAlert = alerts[0] ?? null;

    if (isLoadingTelemetry && rivers.length === 0) {
        return (
            <div className="hg-page-status-box" role="status" aria-live="polite">
                <Loader2 size={32} className="hg-spinner-icon" />
                <h3>Sincronizando Telemetria Hidrológica</h3>
                <p>Obtendo leituras das estações da ANA para {cityDisplayName}...</p>
            </div>
        );
    }

    return (
        <>
            {primaryActiveAlert && (
                <section
                    className={`hg-dashboard-alert-callout is-${primaryActiveAlert.severity.toLowerCase()}`}
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="hg-callout-main">
                        <div className="hg-callout-icon">
                            {primaryActiveAlert.severity === 'CRITICAL' ? (
                                <ShieldAlert size={26} />
                            ) : (
                                <AlertTriangle size={26} />
                            )}
                        </div>

                        <div className="hg-callout-content">
                            <div className="hg-callout-badges">
                <span className="hg-callout-sev-pill">
                  ALERTA{' '}
                    {OFFICIAL_ALERT_SEVERITY_LABELS[primaryActiveAlert.severity]}
                </span>
                                <span className="hg-callout-meta-pill">
                  <MapPin size={13} /> Área Afetada: {primaryActiveAlert.region}
                </span>
                                {primaryActiveAlert.expiresAt && (
                                    <span className="hg-callout-meta-pill">
                    <Clock size={13} /> Válido até:{' '}
                                        {primaryActiveAlert.expiresAt}
                  </span>
                                )}
                            </div>

                            <h2 className="hg-callout-title">{primaryActiveAlert.title}</h2>
                            <p className="hg-callout-desc">
                                {primaryActiveAlert.description}
                            </p>
                        </div>
                    </div>

                    <div className="hg-callout-actions">
                        <Link to={`/${citySlug}/maps`} className="hg-callout-btn-secondary">
                            Ver no Mapa
                        </Link>
                        <Link to={`/${citySlug}/alerts`} className="hg-callout-btn-primary">
                            <span>Orientações ({alerts.length})</span>
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </section>
            )}

            <section
                className="hg-rivers-section"
                aria-labelledby="rivers-section-title"
            >
                <div className="hg-rivers-section-header">
                    <div>
                        <div className="hg-rivers-title-wrap">
                            <h2 id="rivers-section-title" className="hg-section-title">
                                Nível dos Rios em Tempo Real
                            </h2>
                            <span className="hg-rivers-count-badge">
                {rivers.length > 0
                    ? `${rivers.length} estações ativas`
                    : 'Dado indisponível'}
              </span>
                        </div>
                        <p className="hg-data-provenance-line">
                            <Database size={13} />
                            <span>
                <strong>Fonte externa consumida:</strong> Agência Nacional de
                Águas e Saneamento Básico (ANA — Webservice HidroWeb)
              </span>
                            {lastUpdatedAt && (
                                <span>
                  • Sincronizado às{' '}
                                    {lastUpdatedAt.toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                </span>
                            )}
                        </p>
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

                {rivers.length === 0 ? (
                    <div className="hg-telemetry-unavailable-box" role="alert">
                        <WifiOff size={36} className="hg-unavailable-icon" />
                        <div className="hg-unavailable-text">
                            <h3>Dados Hidrológicos Temporariamente Indisponíveis</h3>
                            <p>
                                Não foi possível obter leituras recentes das estações
                                telemétricas da ANA para <strong>{cityDisplayName}</strong> (
                                {systemHealth.message}). O sistema não exibe valores simulados
                                no painel de telemetria para evitar falsa percepção de
                                normalidade.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RefreshCw size={15} />}
                            onClick={handleRetrySync}
                            disabled={isRetrying}
                        >
                            {isRetrying ? 'Verificando fonte...' : 'Tentar Novamente'}
                        </Button>
                    </div>
                ) : (
                    <div
                        ref={carouselRef}
                        onScroll={updateScrollButtons}
                        className={`hg-rivers-carousel ${useTwoRows ? 'is-two-rows' : ''}`}
                    >
                        {rivers.map((river) => (
                            <RiverCard key={river.id} data={river} />
                        ))}
                    </div>
                )}
            </section>

            {historyData.length > 0 && <RiverChart data={historyData} />}

            {rainData && <RainAccumulation data={rainData} />}
        </>
    );
}