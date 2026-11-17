import {
    AlertCircle,
    Clock,
    Database,
    Minus,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { RiverData } from '../../../../types';
import {
    RIVER_STATUS_BADGE_VARIANT,
    RIVER_STATUS_LABELS,
} from '../../../../utils';
import { Badge } from '../../../ui';
import './RiverCard.css';

interface RiverCardProps {
    data: RiverData;
}

export function RiverCard({ data }: RiverCardProps) {
    const badgeVariant = RIVER_STATUS_BADGE_VARIANT[data.status];
    const statusLabel = RIVER_STATUS_LABELS[data.status];
    const statusCssKey = data.status.toLowerCase();

    const renderTrend = () => {
        if (data.trend === 'RISING') {
            return (
                <div className="hg-river-trend-row trend-rising">
          <span className="hg-river-trend-label">
            <TrendingUp size={15} /> Tendência: Subindo
          </span>
                    <strong>+{Math.abs(data.trendDeltaCm)} cm / última leitura</strong>
                </div>
            );
        }
        if (data.trend === 'FALLING') {
            return (
                <div className="hg-river-trend-row trend-falling">
          <span className="hg-river-trend-label">
            <TrendingDown size={15} /> Tendência: Recuando
          </span>
                    <strong>-{Math.abs(data.trendDeltaCm)} cm / última leitura</strong>
                </div>
            );
        }
        return (
            <div className="hg-river-trend-row trend-stable">
        <span className="hg-river-trend-label">
          <Minus size={15} /> Tendência: Estável
        </span>
                <strong>Sem variação brusca</strong>
            </div>
        );
    };

    return (
        <article className={`hg-river-card status-${statusCssKey}`}>
            <header className="hg-river-card-header">
                <div>
                    <h3 className="hg-river-name">{data.name}</h3>
                    <p className="hg-river-location">{data.location}</p>
                </div>

                <div className="hg-river-badges-col">
                    <Badge variant={badgeVariant}>{statusLabel}</Badge>
                    {data.isStale && (
                        <span
                            className="hg-stale-pill"
                            title="A última transmissão desta estação ocorreu há mais de 3 horas."
                        >
              <AlertCircle size={11} /> Desatualizado
            </span>
                    )}
                </div>
            </header>

            <div className="hg-river-card-body">
                <div className="hg-river-measurement">
                    <span className="label">Nível Atual</span>
                    <strong className={`value text-${statusCssKey}`}>
                        {data.currentLevel.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                        <span className="unit-inline">m</span>
                    </strong>
                </div>

                <div className="hg-river-measurement">
                    <span className="label">Vazão</span>
                    {data.flowRate !== null ? (
                        <strong className="value">
                            {data.flowRate.toLocaleString('pt-BR')}
                            <span className="unit-inline">m³/s</span>
                        </strong>
                    ) : (
                        <span
                            className="hg-metric-unavailable"
                            title="Estação opera apenas com sensor de nível (régua linimétrica)"
                        >
              Não medido
            </span>
                    )}
                </div>

                <div className="hg-river-measurement">
                    <span className="label">Capacidade</span>
                    <strong className="value">
                        {data.capacityPercent.toLocaleString('pt-BR')}
                        <span className="unit-inline">%</span>
                    </strong>
                </div>
            </div>

            {renderTrend()}

            <footer className="hg-river-card-footer">
                <div className="hg-river-footer-row">
          <span className="hg-footer-meta">
            <Clock size={12} /> Leitura: <strong>{data.lastUpdate}</strong>
          </span>
                    <span className="hg-footer-source" title={data.source}>
            <Database size={11} /> ANA #{data.id}
          </span>
                </div>
            </footer>
        </article>
    );
}