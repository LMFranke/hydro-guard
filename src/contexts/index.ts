import { createContext, useContext } from 'react';
import type {
    AlertData,
    CityStatusSummary,
    CityTenant,
    CreateAlertInput,
    DailyForecast,
    LoginResponseDTO,
    RainGaugeData,
    RiskZone,
    RiskZoneInput,
    RiverData,
    RiverHistoryData,
    TelemetryStationMarker,
} from '../types';

export interface TenantContextValue {
    citySlug: string;
    tenant: CityTenant | null;
    cityDisplayName: string;
    bannerUrl: string;
    logoUrl: string;
    coordinates: [number, number];
    isLoadingTenant: boolean;
    tenantError: string | null;
}

export interface AuthContextValue {
    session: LoginResponseDTO | null;
    authToken: string | null;
    isCoordinator: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    handleAuthError: (error: unknown) => boolean;
}

export interface MonitoringContextValue {
    rivers: RiverData[];
    stationMarkers: TelemetryStationMarker[];
    historyData: RiverHistoryData[];
    rainData: RainGaugeData | null;
    forecastData: DailyForecast[];
    alerts: AlertData[];
    riskZones: RiskZone[];
    globalStatus: CityStatusSummary;
    isLoadingTelemetry: boolean;
    isLoadingForecast: boolean;
    lastUpdatedAt: Date | null;
    publishAlert: (input: CreateAlertInput) => Promise<AlertData>;
    deactivateAlert: (alertId: string) => Promise<void>;
    addRiskZone: (input: RiskZoneInput) => Promise<RiskZone>;
    editRiskZone: (id: string, input: RiskZoneInput) => Promise<RiskZone>;
    removeRiskZone: (id: string) => Promise<void>;
}

export const TenantContext = createContext<TenantContextValue | undefined>(undefined);
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined);

export function useTenant(): TenantContextValue {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant deve ser utilizado dentro de um TenantProvider.');
    }
    return context;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
    }
    return context;
}

export function useMonitoring(): MonitoringContextValue {
    const context = useContext(MonitoringContext);
    if (!context) {
        throw new Error('useMonitoring deve ser utilizado dentro de um MonitoringProvider.');
    }
    return context;
}