import {
    useState,
    useEffect,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import { APP_CONFIG } from '../config/env';
import {
    createOfficialAlert,
    createRiskZone,
    deactivateOfficialAlert,
    deleteRiskZone,
    fetchActiveAlerts,
    fetchCityRiskZones,
    fetchMappedCityTelemetry,
    fetchWeatherForecast,
    updateRiskZone,
} from '../services';
import type {
    AlertData,
    CreateAlertInput,
    DailyForecast,
    RainGaugeData,
    RiskZone,
    RiskZoneInput,
    RiverData,
    RiverHistoryData,
    TelemetryStationMarker,
} from '../types';
import { evaluateCityGlobalStatus } from '../utils';
import {
    MonitoringContext,
    useAuth,
    useTenant,
    type MonitoringContextValue,
} from './index';

export function MonitoringProvider({ children }: { children: ReactNode }) {
    const { citySlug, coordinates, isLoadingTenant } = useTenant();
    const { authToken, handleAuthError } = useAuth();

    const [rivers, setRivers] = useState<RiverData[]>([]);
    const [stationMarkers, setStationMarkers] = useState<TelemetryStationMarker[]>([]);
    const [historyData, setHistoryData] = useState<RiverHistoryData[]>([]);
    const [rainData, setRainData] = useState<RainGaugeData | null>(null);
    const [forecastData, setForecastData] = useState<DailyForecast[]>([]);
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
    const [isLoadingTelemetry, setIsLoadingTelemetry] = useState<boolean>(true);
    const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(true);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    const [lat, lng] = coordinates;

    useEffect(() => {
        let isMounted = true;

        async function loadCityOperationalData() {
            const [telemetryResult, alertsResult, zonesResult] = await Promise.allSettled([
                fetchMappedCityTelemetry(citySlug),
                fetchActiveAlerts(citySlug),
                fetchCityRiskZones(citySlug),
            ]);

            if (!isMounted) return;

            if (telemetryResult.status === 'fulfilled') {
                setRivers(telemetryResult.value.rivers);
                setStationMarkers(telemetryResult.value.stationMarkers);
                setHistoryData(telemetryResult.value.historyData);
                setRainData(telemetryResult.value.rainData);
            } else {
                console.error('[HydroGuard] Erro ao carregar telemetria:', telemetryResult.reason);
            }

            if (alertsResult.status === 'fulfilled') {
                setAlerts(alertsResult.value);
            } else {
                console.error('[HydroGuard] Erro ao carregar alertas:', alertsResult.reason);
            }

            if (zonesResult.status === 'fulfilled') {
                setRiskZones(zonesResult.value);
            } else {
                console.error('[HydroGuard] Erro ao carregar zonas de risco:', zonesResult.reason);
            }

            setLastUpdatedAt(new Date());
            setIsLoadingTelemetry(false);
        }

        void loadCityOperationalData();

        const intervalId = window.setInterval(() => {
            void loadCityOperationalData();
        }, APP_CONFIG.TELEMETRY_POLLING_INTERVAL_MS);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [citySlug]);

    useEffect(() => {
        if (isLoadingTenant) return;

        let isMounted = true;

        async function loadWeather() {
            try {
                const forecast = await fetchWeatherForecast(lat, lng);
                if (isMounted) {
                    setForecastData(forecast);
                }
            } catch (error) {
                console.error('[HydroGuard] Erro ao carregar previsão meteorológica:', error);
            } finally {
                if (isMounted) {
                    setIsLoadingForecast(false);
                }
            }
        }

        void loadWeather();

        return () => {
            isMounted = false;
        };
    }, [isLoadingTenant, lat, lng]);

    const publishAlert = useCallback(
        async (input: CreateAlertInput): Promise<AlertData> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                const created = await createOfficialAlert(authToken, input);
                setAlerts((prev) => [created, ...prev]);
                return created;
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, handleAuthError]
    );

    const deactivateAlert = useCallback(
        async (alertId: string): Promise<void> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                await deactivateOfficialAlert(authToken, alertId);
                setAlerts((prev) => prev.filter((item) => item.id !== alertId));
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, handleAuthError]
    );

    const addRiskZone = useCallback(
        async (input: RiskZoneInput): Promise<RiskZone> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                const created = await createRiskZone(authToken, input);
                setRiskZones((prev) => [...prev, created]);
                return created;
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, handleAuthError]
    );

    const editRiskZone = useCallback(
        async (id: string, input: RiskZoneInput): Promise<RiskZone> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                const updated = await updateRiskZone(authToken, id, input);
                setRiskZones((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                return updated;
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, handleAuthError]
    );

    const removeRiskZone = useCallback(
        async (id: string): Promise<void> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                await deleteRiskZone(authToken, id);
                setRiskZones((prev) => prev.filter((item) => item.id !== id));
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, handleAuthError]
    );

    const globalStatus = useMemo(
        () => evaluateCityGlobalStatus(rivers, alerts),
        [rivers, alerts]
    );

    const value = useMemo<MonitoringContextValue>(
        () => ({
            rivers,
            stationMarkers,
            historyData,
            rainData,
            forecastData,
            alerts,
            riskZones,
            globalStatus,
            isLoadingTelemetry,
            isLoadingForecast,
            lastUpdatedAt,
            publishAlert,
            deactivateAlert,
            addRiskZone,
            editRiskZone,
            removeRiskZone,
        }),
        [
            rivers,
            stationMarkers,
            historyData,
            rainData,
            forecastData,
            alerts,
            riskZones,
            globalStatus,
            isLoadingTelemetry,
            isLoadingForecast,
            lastUpdatedAt,
            publishAlert,
            deactivateAlert,
            addRiskZone,
            editRiskZone,
            removeRiskZone,
        ]
    );

    return (
        <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
    );
}