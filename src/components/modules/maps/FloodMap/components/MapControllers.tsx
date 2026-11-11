import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

export function MapViewportSync({
                                    center,
                                    isMaximized,
                                }: {
    center: [number, number];
    isMaximized: boolean;
}) {
    const map = useMap();
    const [lat, lng] = center;

    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
        const timer = window.setTimeout(() => {
            map.invalidateSize();
        }, 200);
        return () => window.clearTimeout(timer);
    }, [map, lat, lng]);

    useEffect(() => {
        map.invalidateSize();
        const timer = window.setTimeout(() => {
            map.invalidateSize();
        }, 150);
        return () => window.clearTimeout(timer);
    }, [map, isMaximized]);

    return null;
}

export function MapClickHandler({
                                    enabled,
                                    onMapClick,
                                }: {
    enabled: boolean;
    onMapClick: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            if (enabled) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}