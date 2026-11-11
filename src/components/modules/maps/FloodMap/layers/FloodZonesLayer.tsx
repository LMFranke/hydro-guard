import { Circle, Popup } from 'react-leaflet';
import type { RiskZone } from '../../../../../types';
import { getRiskZoneColor } from '../../../../../utils';
import { RiskZonePopup } from '../components/RiskZonePopup';

interface FloodZonesLayerProps {
    zones: RiskZone[];
    isCoordinator: boolean;
    onEdit: (zone: RiskZone) => void;
    onDelete: (id: string) => void;
}

export function FloodZonesLayer({
                                    zones,
                                    isCoordinator,
                                    onEdit,
                                    onDelete,
                                }: FloodZonesLayerProps) {
    const floodZones = zones.filter((zone) => zone.zoneType === 'FLOOD');

    return (
        <>
            {floodZones.map((zone) => {
                const zoneColor = getRiskZoneColor(zone.level, 'FLOOD');

                return (
                    <Circle
                        key={zone.id}
                        center={zone.coordinates}
                        radius={zone.radius}
                        pathOptions={{
                            color: zoneColor,
                            fillColor: zoneColor,
                            fillOpacity: 0.5,
                            weight: 2,
                        }}
                    >
                        <Popup>
                            <RiskZonePopup
                                zone={zone}
                                isCoordinator={isCoordinator}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        </Popup>
                    </Circle>
                );
            })}
        </>
    );
}