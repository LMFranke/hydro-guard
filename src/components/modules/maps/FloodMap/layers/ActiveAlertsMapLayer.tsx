import { Circle, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import type { AlertData, OfficialAlertSeverity } from '../../../../../types';
import { OFFICIAL_ALERT_SEVERITY_LABELS } from '../../../../../utils';
import { Badge, type BadgeVariant } from '../../../../ui';

interface ActiveAlertsMapLayerProps {
    alerts: AlertData[];
    cityCenter: [number, number];
}

const ALERT_MARKER_COLOR: Record<OfficialAlertSeverity, string> = {
    CRITICAL: '#dc2626',
    WARNING: '#ea580c',
    WATCH: '#ca8a04',
};

export function ActiveAlertsMapLayer({
                                         alerts,
                                         cityCenter,
                                     }: ActiveAlertsMapLayerProps) {
    if (alerts.length === 0) return null;

    return (
        <>
            {alerts.map((alertItem, idx) => {
                const baseCoords = alertItem.coordinates ?? [
                    cityCenter[0] + idx * 0.0025,
                    cityCenter[1] - idx * 0.0025,
                ];
                const color = ALERT_MARKER_COLOR[alertItem.severity];
                const badgeVariant =
                    alertItem.severity.toLowerCase() as BadgeVariant;

                return (
                    <div key={alertItem.id}>
                        <Circle
                            center={baseCoords}
                            radius={320}
                            pathOptions={{
                                color,
                                fillColor: color,
                                fillOpacity: 0.22,
                                weight: 2,
                                dashArray: '6 4',
                            }}
                        />

                        <CircleMarker
                            center={baseCoords}
                            radius={10}
                            pathOptions={{
                                color: '#ffffff',
                                weight: 3,
                                fillColor: color,
                                fillOpacity: 1,
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -8]}>
                                <strong>ALERTA ATIVO: {alertItem.title}</strong> ({alertItem.region})
                            </Tooltip>

                            <Popup>
                                <div className="hg-map-popup">
                                    <strong>{alertItem.title}</strong>
                                    <div>
                                        <Badge variant={badgeVariant}>
                                            Alerta {OFFICIAL_ALERT_SEVERITY_LABELS[alertItem.severity]}
                                        </Badge>
                                    </div>
                                    <p>
                                        <strong>Área Afetada:</strong> {alertItem.region}
                                    </p>
                                    <p>{alertItem.description}</p>
                                    <span className="hg-station-popup-meta">
                    Origem: {alertItem.source}
                  </span>
                                    {alertItem.expiresAt && (
                                        <span className="hg-station-popup-meta">
                      Válido até: {alertItem.expiresAt}
                    </span>
                                    )}
                                </div>
                            </Popup>
                        </CircleMarker>
                    </div>
                );
            })}
        </>
    );
}