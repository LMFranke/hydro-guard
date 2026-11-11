import { useState } from 'react';
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
import type { RiverHistoryData } from '../../../../types';
import './RiverChart.css';

interface RiverChartProps {
    data: RiverHistoryData[];
}

export function RiverChart({ data }: RiverChartProps) {
    const [selectedRiverId, setSelectedRiverId] = useState<string>('');

    if (data.length === 0) {
        return null;
    }

    const currentRiver =
        data.find((r) => r.riverId === selectedRiverId) ?? data[0];

    const maxMeasured = Math.max(...currentRiver.history.map((d) => d.level), 0);
    const yAxisMax = Math.ceil(
        Math.max(maxMeasured, currentRiver.thresholds.emergency) + 1
    );

    return (
        <section className="hg-surface-section" aria-labelledby="chart-title">
            <header className="hg-chart-header">
                <h2 id="chart-title" className="hg-chart-title">
                    Nível nas Últimas 24 Horas
                </h2>

                <div className="hg-chart-controls">
                    <label htmlFor="river-select" className="visually-hidden">
                        Selecione o Rio
                    </label>
                    <select
                        id="river-select"
                        className="hg-river-select"
                        value={currentRiver.riverId}
                        onChange={(e) => setSelectedRiverId(e.target.value)}
                    >
                        {data.map((river) => (
                            <option key={river.riverId} value={river.riverId}>
                                {river.riverName}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="hg-chart-container">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                        data={currentRiver.history}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                        />
                        <XAxis
                            dataKey="time"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickMargin={10}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            domain={[0, yAxisMax]}
                            tickFormatter={(val) => `${val}m`}
                        />
                        <Tooltip
                            formatter={(value) => {
                                const rawValue = Array.isArray(value) ? value[0] : value;
                                const numericValue = Number(rawValue ?? 0);
                                return [`${numericValue.toFixed(2)}m`, 'Nível'];
                            }}
                            labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        />

                        <ReferenceLine
                            y={currentRiver.thresholds.attention}
                            stroke="#f59e0b"
                            strokeDasharray="3 3"
                            label={{
                                position: 'insideTopLeft',
                                value: `Atenção ${currentRiver.thresholds.attention}m`,
                                fill: '#f59e0b',
                                fontSize: 12,
                            }}
                        />
                        <ReferenceLine
                            y={currentRiver.thresholds.warning}
                            stroke="#f97316"
                            strokeDasharray="3 3"
                            label={{
                                position: 'insideTopLeft',
                                value: `Alerta ${currentRiver.thresholds.warning}m`,
                                fill: '#f97316',
                                fontSize: 12,
                            }}
                        />
                        <ReferenceLine
                            y={currentRiver.thresholds.emergency}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                                position: 'insideTopLeft',
                                value: `Emergência ${currentRiver.thresholds.emergency}m`,
                                fill: '#ef4444',
                                fontSize: 12,
                            }}
                        />

                        <Area
                            type="monotone"
                            dataKey="level"
                            stroke="#2563eb"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorLevel)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}