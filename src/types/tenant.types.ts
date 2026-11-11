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