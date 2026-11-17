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
    fetchAlertHistory,
    fetchCityRiskZones,
    fetchMappedCityTelemetry,
    fetchSystemHealth,
    fetchWeatherForecast,
    INITIAL_HEALTH_STATE,
    resolveSystemHealthState,
    setSimulatedAnaOutage,
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
    const [alertHistory, setAlertHistory] = useState<AlertData[]>(
        () => initialOpsCache?.data.alertHistory ?? []
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

    const syncOperationalData = useCallback(async () => {
        const [
            telemetryResult,
            alertsResult,
            historyAlertsResult,
            zonesResult,
            healthResult,
        ] = await Promise.allSettled([
            fetchMappedCityTelemetry(citySlug),
            fetchActiveAlerts(citySlug),
            fetchAlertHistory(citySlug),
            fetchCityRiskZones(citySlug),
            fetchSystemHealth(),
        ]);

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

        const nextAlertHistory =
            historyAlertsResult.status === 'fulfilled'
                ? historyAlertsResult.value
                : (existing?.alertHistory ?? []);

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
        setAlertHistory(nextAlertHistory);
        setRiskZones(nextRiskZones);
        setSystemHealth(nextHealth);
        setLastUpdatedAt(new Date());
        setIsLoadingTelemetry(false);

        writeOperationalCache(citySlug, {
            rivers: nextRivers,
            stationMarkers: nextStationMarkers,
            historyData: nextHistoryData,
            alertHistory: nextAlertHistory,
            rainData: nextRainData,
            alerts: nextAlerts,
            riskZones: nextRiskZones,
            systemHealth: nextHealth,
        });
    }, [citySlug]);

    const checkSystemHealthNow = useCallback(async () => {
        await syncOperationalData();
    }, [syncOperationalData]);

    const toggleAnaOutageSimulation = useCallback(
        async (active: boolean) => {
            if (!authToken) {
                throw new Error('Sessão de coordenador necessária.');
            }
            try {
                await setSimulatedAnaOutage(authToken, active);
                await syncOperationalData();
            } catch (error) {
                handleAuthError(error);
                throw error;
            }
        },
        [authToken, syncOperationalData, handleAuthError]
    );

    useEffect(() => {
        let isMounted = true;

        async function runInitialSync() {
            if (!isMounted) return;
            await syncOperationalData();
        }

        void runInitialSync();

        const telemetryIntervalId = window.setInterval(() => {
            if (isMounted) {
                void syncOperationalData();
            }
        }, APP_CONFIG.TELEMETRY_POLLING_INTERVAL_MS);

        return () => {
            isMounted = false;
            window.clearInterval(telemetryIntervalId);
        };
    }, [syncOperationalData]);

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
                console.error(
                    '[HydroGuard] Erro ao carregar previsão meteorológica:',
                    error
                );
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
                const closedAlert = await deactivateOfficialAlert(authToken, alertId);
                setAlerts((prev) => {
                    const target = prev.find((item) => item.id === alertId);
                    const nextActive = prev.filter((item) => item.id !== alertId);

                    const resolvedClosed: AlertData | null =
                        closedAlert ??
                        (target
                            ? {
                                ...target,
                                lifecycleStatus: 'CLOSED',
                                closedAt: new Date().toLocaleString('pt-BR'),
                                updatedAt: new Date().toLocaleString('pt-BR'),
                            }
                            : null);

                    if (resolvedClosed) {
                        setAlertHistory((prevHist) => {
                            const nextHist = [
                                resolvedClosed,
                                ...prevHist.filter((h) => h.id !== alertId),
                            ];
                            patchOperationalCache(citySlug, {
                                alerts: nextActive,
                                alertHistory: nextHist,
                            });
                            return nextHist;
                        });
                    } else {
                        patchOperationalCache(citySlug, { alerts: nextActive });
                    }

                    return nextActive;
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
            alertHistory,
            riskZones,
            globalStatus,
            systemHealth,
            isLoadingTelemetry,
            isLoadingForecast,
            lastUpdatedAt,
            checkSystemHealthNow,
            toggleAnaOutageSimulation,
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
            alertHistory,
            riskZones,
            globalStatus,
            systemHealth,
            isLoadingTelemetry,
            isLoadingForecast,
            lastUpdatedAt,
            checkSystemHealthNow,
            toggleAnaOutageSimulation,
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