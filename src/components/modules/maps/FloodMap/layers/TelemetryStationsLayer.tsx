import { CircleMarker, Popup } from 'react-leaflet';
import type {
    RiverStatus,
    TelemetryStationMarker,
} from '../../../../../types';
import {
    formatShortDateTimePtBr,
    RIVER_STATUS_LABELS,
} from '../../../../../utils';
import { Badge, type BadgeVariant } from '../../../../ui';

interface TelemetryStationsLayerProps {
    stations: TelemetryStationMarker[];
}

const STATION_MARKER_COLOR: Record<RiverStatus, string> = {
    CRITICAL: '#ef4444',
    WARNING: '#f59e0b',
    NORMAL: '#10b981',
    BELOW: '#3b82f6',
};

export function TelemetryStationsLayer({
                                           stations,
                                       }: TelemetryStationsLayerProps) {
    return (
        <>
            {stations.map((station) => {
                const statusVariant = station.status.toLowerCase() as BadgeVariant;

                return (
                    <CircleMarker
                        key={station.stationCode}
                        center={station.coordinates}
                        radius={9}
                        pathOptions={{
                            color: '#ffffff',
                            weight: 3,
                            fillColor: STATION_MARKER_COLOR[station.status],
                            fillOpacity: 1,
                        }}
                    >
                        <Popup>
                            <div className="hg-map-popup">
                                <strong>{station.stationName}</strong>
                                <span className="hg-station-popup-meta">
                  Estação ANA #{station.stationCode} • {station.riverName}
                </span>
                                <div>
                                    <Badge variant={statusVariant}>
                                        {RIVER_STATUS_LABELS[station.status]}
                                    </Badge>
                                </div>

                                <div className="hg-station-metrics-grid">
                                    {station.currentLevelMeters !== null && (
                                        <div className="hg-station-metric-item">
                                            <span>Nível</span>
                                            <strong>
                                                {station.currentLevelMeters.toFixed(2)} m
                                            </strong>
                                        </div>
                                    )}

                                    {station.currentFlowM3s !== null && (
                                        <div className="hg-station-metric-item">
                                            <span>Vazão</span>
                                            <strong>
                                                {station.currentFlowM3s.toLocaleString('pt-BR', {
                                                    maximumFractionDigits: 1,
                                                })}{' '}
                                                m³/s
                                            </strong>
                                        </div>
                                    )}

                                    <div className="hg-station-metric-item">
                                        <span>Chuva 24h</span>
                                        <strong>{station.accumulatedRain24hMm} mm</strong>
                                    </div>
                                </div>

                                <span className="hg-station-popup-meta">
                  Leitura: {formatShortDateTimePtBr(station.lastRead)}
                </span>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </>
    );
}