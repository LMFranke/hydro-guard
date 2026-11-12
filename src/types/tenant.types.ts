export interface CityTenant {
    id: string;
    slug: string;
    name: string;
    state: string;
    anaMunicipalityCode: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    mapLat: number;
    mapLng: number;
    themeColor: string | null;
}

export type CityGlobalStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface CityStatusSummary {
    status: CityGlobalStatus;
    label: 'Normal' | 'Alerta' | 'Crítico';
    badgeVariant: 'normal' | 'warning' | 'critical';
}

export type ServiceOperationalStatus =
    | 'ONLINE'
    | 'INSTABLE'
    | 'OFFLINE'
    | 'CHECKING';

export interface SystemHealthDTO {
    backendStatus: 'ONLINE' | 'INSTABLE' | 'OFFLINE';
    anaApiStatus: 'ONLINE' | 'INSTABLE' | 'OFFLINE';
    anaLatencyMs: number | null;
    checkedAt: string;
    lastAnaSuccessAt: string | null;
    message: string;
}

export interface SystemHealthState {
    backendStatus: ServiceOperationalStatus;
    anaApiStatus: ServiceOperationalStatus;
    anaLatencyMs: number | null;
    checkedAt: string | null;
    message: string;
}