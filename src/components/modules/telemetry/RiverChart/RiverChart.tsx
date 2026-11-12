import { useState, useId } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useMonitoring } from '../../../../contexts';
import type { RiverHistoryData } from '../../../../types';
import './RiverChart.css';

interface RiverChartProps {
    data?: RiverHistoryData[];
}

export function RiverChart({ data }: RiverChartProps) {
    const { historyData } = useMonitoring();
    const riversList = data ?? historyData;

    const [selectedRiverId, setSelectedRiverId] = useState<string>('');
    const gradientId = useId();

    if (!riversList || riversList.length === 0) {
        return (
            <section className="hg-chart-card">
                <div className="hg-chart-empty">
                    Sem histórico telemétrico disponível nas últimas 24 horas.
                </div>
            </section>
        );
    }

    const currentRiver =
        riversList.find((r) => r.riverId === selectedRiverId) ?? riversList[0];

    const maxThreshold = Math.max(
        currentRiver.thresholds.emergency,
        ...currentRiver.history.map((d) => d.level)
    );
    const yAxisMax = Math.ceil(maxThreshold * 1.15);

    return (
        <section className="hg-chart-card" aria-label="Nível nas Últimas 24 Horas">
            <header className="hg-chart-header">
                <div className="hg-chart-title-group">
                    <span className="hg-chart-indicator" />
                    <h2 className="hg-chart-title">Nível nas Últimas 24 Horas</h2>
                </div>

                <div className="hg-chart-select-wrapper">
                    <div className="hg-chart-select-tooltip" role="tooltip">
                        {currentRiver.riverName}
                    </div>

                    <select
                        className="hg-chart-select"
                        value={currentRiver.riverId}
                        onChange={(e) => setSelectedRiverId(e.target.value)}
                        title={currentRiver.riverName}
                        aria-label="Selecionar estação para visualizar histórico de 24 horas"
                    >
                        {riversList.map((river) => (
                            <option
                                key={river.riverId}
                                value={river.riverId}
                                title={river.riverName}
                            >
                                {river.riverName}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="hg-chart-body">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={currentRiver.history}
                        margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.08} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                        />
                        <XAxis
                            dataKey="time"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, yAxisMax]}
                            unit="m"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickLine={false}
                        />
                        <Tooltip
                            formatter={(value) => [
                                `${Number(value ?? 0).toFixed(2)}m`,
                                'Nível',
                            ]}
                            labelFormatter={(label) => `Horário: ${String(label ?? '')}`}
                            contentStyle={{
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            }}
                        />

                        <ReferenceLine
                            y={currentRiver.thresholds.attention}
                            stroke="#f59e0b"
                            strokeDasharray="3 3"
                            label={{
                                position: 'insideBottomLeft',
                                value: `Atenção ${currentRiver.thresholds.attention}m`,
                                fill: '#d97706',
                                fontSize: 11,
                            }}
                        />
                        <ReferenceLine
                            y={currentRiver.thresholds.warning}
                            stroke="#f97316"
                            strokeDasharray="3 3"
                            label={{
                                position: 'insideBottomLeft',
                                value: `Alerta ${currentRiver.thresholds.warning}m`,
                                fill: '#ea580c',
                                fontSize: 11,
                            }}
                        />
                        <ReferenceLine
                            y={currentRiver.thresholds.emergency}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                                position: 'insideBottomLeft',
                                value: `Emergência ${currentRiver.thresholds.emergency}m`,
                                fill: '#dc2626',
                                fontSize: 11,
                            }}
                        />

                        <Area
                            type="monotone"
                            dataKey="level"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}