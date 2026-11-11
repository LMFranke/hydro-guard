import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { RiverData, RiverTrend } from '../../../../types';
import { formatShortDateTimePtBr, RIVER_STATUS_LABELS } from '../../../../utils';
import { Badge, type BadgeVariant } from '../../../ui';
import './RiverCard.css';

interface RiverCardProps {
    data: RiverData;
}

function getTrendMetadata(trend: RiverTrend, deltaCm: number) {
    const formattedDelta =
        deltaCm > 0 ? `+${deltaCm} cm` : deltaCm < 0 ? `${deltaCm} cm` : '0 cm';

    switch (trend) {
        case 'RISING':
            return {
                icon: <TrendingUp size={16} />,
                label: 'Subindo',
                deltaText: `${formattedDelta} / última leitura`,
                className: 'trend-rising',
            };
        case 'FALLING':
            return {
                icon: <TrendingDown size={16} />,
                label: 'Recuando',
                deltaText: `${formattedDelta} / última leitura`,
                className: 'trend-falling',
            };
        case 'STABLE':
            return {
                icon: <Minus size={16} />,
                label: 'Estável',
                deltaText: 'Sem variação brusca',
                className: 'trend-stable',
            };
    }
}

export function RiverCard({ data }: RiverCardProps) {
    const statusKey = data.status.toLowerCase() as BadgeVariant;
    const formattedDate = formatShortDateTimePtBr(data.lastRead);
    const trendMeta = getTrendMetadata(data.trend, data.levelDeltaCm);

    return (
        <article className={`hg-river-card status-${statusKey}`}>
            <header className="hg-river-card-header">
                <div>
                    <h3 className="hg-river-name">{data.name}</h3>
                    <p className="hg-river-location">{data.location}</p>
                </div>
                <Badge variant={statusKey}>{RIVER_STATUS_LABELS[data.status]}</Badge>
            </header>

            <div className="hg-river-card-body">
                <div className="hg-river-measurement">
                    <span className="label">Nível Atual</span>
                    <data className={`value text-${statusKey}`} value={data.currentLevel}>
                        {data.currentLevel.toFixed(2)}m
                    </data>
                </div>

                {data.currentFlowM3s !== null && (
                    <div className="hg-river-measurement">
                        <span className="label">Vazão</span>
                        <data className="value" value={data.currentFlowM3s}>
                            {data.currentFlowM3s.toLocaleString('pt-BR', {
                                maximumFractionDigits: 1,
                            })}
                            <span className="unit-inline">m³/s</span>
                        </data>
                    </div>
                )}

                <div className="hg-river-measurement">
                    <span className="label">Capacidade</span>
                    <data className="value" value={data.capacityPercentage}>
                        {data.capacityPercentage.toLocaleString('pt-BR')}%
                    </data>
                </div>
            </div>

            <div className={`hg-river-trend-row ${trendMeta.className}`}>
        <span className="hg-river-trend-label">
          {trendMeta.icon}
            <span>Tendência: {trendMeta.label}</span>
        </span>
                <span>{trendMeta.deltaText}</span>
            </div>

            <footer className="hg-river-card-footer">
                <span>Última leitura:</span>
                <time dateTime={data.lastRead}>{formattedDate}</time>
            </footer>
        </article>
    );
}