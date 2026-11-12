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
    fetchSystemHealth,
    fetchWeatherForecast,
    INITIAL_HEALTH_STATE,
    probeSystemHealthLive,
    resolveSystemHealthState,
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
    SystemHealthState,
    TelemetryStationMarker,
} from '../types';
import {
    CACHE_TTL,
    evaluateCityGlobalStatus,
    patchOperationalCache,
    readCache,
    readOperationalCache,
    writeCache,
    writeOperationalCache,
} from '../utils';
import {
    MonitoringContext,
    useAuth,
    useTenant,
    type MonitoringContextValue,
} from './index';

export function MonitoringProvider({ children }: { children: ReactNode }) {
    const { citySlug, coordinates, isLoadingTenant } = useTenant();
    const { authToken, handleAuthError } = useAuth();

    const weatherCacheKey = `weather_${citySlug}`;

    const initialOpsCache = useMemo(
        () => readOperationalCache(citySlug),
        [citySlug]
    );
    const initialWeatherCache = useMemo(
        () => readCache<DailyForecast[]>(weatherCacheKey),
        [weatherCacheKey]
    );

    const [rivers, setRivers] = useState<RiverData[]>(
        () => initialOpsCache?.data.rivers ?? []
    );
    const [stationMarkers, setStationMarkers] = useState<TelemetryStationMarker[]>(
        () => initialOpsCache?.data.stationMarkers ?? []
    );
    const [historyData, setHistoryData] = useState<RiverHistoryData[]>(
        () => initialOpsCache?.data.historyData ?? []
    );
    const [rainData, setRainData] = useState<RainGaugeData | null>(
        () => initialOpsCache?.data.rainData ?? null
    );
    const [alerts, setAlerts] = useState<AlertData[]>(
        () => initialOpsCache?.data.alerts ?? []
    );
    const [riskZones, setRiskZones] = useState<RiskZone[]>(
        () => initialOpsCache?.data.riskZones ?? []
    );
    const [systemHealth, setSystemHealth] = useState<SystemHealthState>(
        () => initialOpsCache?.data.systemHealth ?? INITIAL_HEALTH_STATE
    );
    const [forecastData, setForecastData] = useState<DailyForecast[]>(
        () => initialWeatherCache?.data ?? []
    );

    const [isLoadingTelemetry, setIsLoadingTelemetry] = useState<boolean>(
        () => initialOpsCache === null
    );
    const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(
        () => initialWeatherCache === null
    );
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(() =>
        initialOpsCache ? new Date(initialOpsCache.updatedAt) : null
    );

    const [lat, lng] = coordinates;

    const checkSystemHealthNow = useCallback(async () => {
        const liveHealth = await probeSystemHealthLive();
        setSystemHealth(liveHealth);
        patchOperationalCache(citySlug, { systemHealth: liveHealth });
    }, [citySlug]);

    useEffect(() => {
        let isMounted = true;

        async function fetchAndCacheOperationalData() {
            const [telemetryResult, alertsResult, zonesResult, healthResult] =
                await Promise.allSettled([
                    fetchMappedCityTelemetry(citySlug),
                    fetchActiveAlerts(citySlug),
                    fetchCityRiskZones(citySlug),
                    fetchSystemHealth(),
                ]);

            if (!isMounted) return;

            const existing = readOperationalCache(citySlug)?.data;
            const telemetrySucceeded = telemetryResult.status === 'fulfilled';

            const nextRivers = telemetrySucceeded
                ? telemetryResult.value.rivers
                : (existing?.rivers ?? []);

            const nextStationMarkers = telemetrySucceeded
                ? telemetryResult.value.stationMarkers
                : (existing?.stationMarkers ?? []);

            const nextHistoryData = telemetrySucceeded
                ? telemetryResult.value.historyData
                : (existing?.historyData ?? []);

            const nextRainData = telemetrySucceeded
                ? telemetryResult.value.rainData
                : (existing?.rainData ?? null);

            const nextAlerts =
                alertsResult.status === 'fulfilled'
                    ? alertsResult.value
                    : (existing?.alerts ?? []);

            const nextRiskZones =
                zonesResult.status === 'fulfilled'
                    ? zonesResult.value
                    : (existing?.riskZones ?? []);

            const anyBackendCallWorked =
                telemetrySucceeded ||
                alertsResult.status === 'fulfilled' ||
                zonesResult.status === 'fulfilled';

            const nextHealth = resolveSystemHealthState(
                healthResult,
                anyBackendCallWorked,
                nextRivers.length > 0
            );

            setRivers(nextRivers);
            setStationMarkers(nextStationMarkers);
            setHistoryData(nextHistoryData);
            setRainData(nextRainData);
            setAlerts(nextAlerts);
            setRiskZones(nextRiskZones);
            setSystemHealth(nextHealth);
            setLastUpdatedAt(new Date());
            setIsLoadingTelemetry(false);

            if (nextRivers.length > 0) {
                writeOperationalCache(citySlug, {
                    rivers: nextRivers,
                    stationMarkers: nextStationMarkers,
                    historyData: nextHistoryData,
                    rainData: nextRainData,
                    alerts: nextAlerts,
                    riskZones: nextRiskZones,
                    systemHealth: nextHealth,
                });
            }
        }

        async function revalidateCachedHealth() {
            const liveHealth = await probeSystemHealthLive();
            if (!isMounted) return;
            setSystemHealth(liveHealth);
            patchOperationalCache(citySlug, { systemHealth: liveHealth });
        }

        const cached = readOperationalCache(citySlug);
        if (!cached || cached.isExpired || cached.data.rivers.length === 0) {
            void fetchAndCacheOperationalData();
        } else if (cached.data.systemHealth.anaApiStatus !== 'ONLINE') {
            void revalidateCachedHealth();
        }

        const telemetryIntervalId = window.setInterval(() => {
            void fetchAndCacheOperationalData();
        }, APP_CONFIG.TELEMETRY_POLLING_INTERVAL_MS);

        return () => {
            isMounted = false;
            window.clearInterval(telemetryIntervalId);
        };
    }, [citySlug]);

    useEffect(() => {
        if (isLoadingTenant) return;

        const cachedWeather = readCache<DailyForecast[]>(weatherCacheKey);
        if (cachedWeather && !cachedWeather.isExpired) {
            return;
        }

        let isMounted = true;

        async function loadWeather() {
            try {
                const forecast = await fetchWeatherForecast(lat, lng);
                if (isMounted) {
                    setForecastData(forecast);
                    writeCache(weatherCacheKey, forecast, CACHE_TTL.WEATHER_MS);
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
    }, [isLoadingTenant, lat, lng, weatherCacheKey]);

    const publishAlert = useCallback(
        async (input: CreateAlertInput): Promise<AlertData> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                const created = await createOfficialAlert(authToken, input);
                setAlerts((prev) => {
                    const next = [created, ...prev];
                    patchOperationalCache(citySlug, { alerts: next });
                    return next;
                });
                return created;
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, citySlug, handleAuthError]
    );

    const deactivateAlert = useCallback(
        async (alertId: string): Promise<void> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                await deactivateOfficialAlert(authToken, alertId);
                setAlerts((prev) => {
                    const next = prev.filter((item) => item.id !== alertId);
                    patchOperationalCache(citySlug, { alerts: next });
                    return next;
                });
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, citySlug, handleAuthError]
    );

    const addRiskZone = useCallback(
        async (input: RiskZoneInput): Promise<RiskZone> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                const created = await createRiskZone(authToken, input);
                setRiskZones((prev) => {
                    const next = [...prev, created];
                    patchOperationalCache(citySlug, { riskZones: next });
                    return next;
                });
                return created;
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, citySlug, handleAuthError]
    );

    const editRiskZone = useCallback(
        async (id: string, input: RiskZoneInput): Promise<RiskZone> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                const updated = await updateRiskZone(authToken, id, input);
                setRiskZones((prev) => {
                    const next = prev.map((item) =>
                        item.id === updated.id ? updated : item
                    );
                    patchOperationalCache(citySlug, { riskZones: next });
                    return next;
                });
                return updated;
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, citySlug, handleAuthError]
    );

    const removeRiskZone = useCallback(
        async (id: string): Promise<void> => {
            if (!authToken) throw new Error('Sessão de coordenador necessária.');
            try {
                await deleteRiskZone(authToken, id);
                setRiskZones((prev) => {
                    const next = prev.filter((item) => item.id !== id);
                    patchOperationalCache(citySlug, { riskZones: next });
                    return next;
                });
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, citySlug, handleAuthError]
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
            systemHealth,
            isLoadingTelemetry,
            isLoadingForecast,
            lastUpdatedAt,
            checkSystemHealthNow,
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
            systemHealth,
            isLoadingTelemetry,
            isLoadingForecast,
            lastUpdatedAt,
            checkSystemHealthNow,
            publishAlert,
            deactivateAlert,
            addRiskZone,
            editRiskZone,
            removeRiskZone,
        ]
    );

    return (
        <MonitoringContext.Provider value={value}>
            {children}
        </MonitoringContext.Provider>
    );
}