import { useState, useEffect, useMemo, type ReactNode } from 'react';
import defaultBannerFallback from '../assets/banner-rodeio.png';
import defaultLogoFallback from '../assets/logo-rodeio.png';
import { APP_CONFIG, ENV } from '../config/env';
import { fetchCityTenant } from '../services';
import type { CityTenant } from '../types';
import { applyTenantBranding, formatCityDisplayName } from '../utils';
import { TenantContext, type TenantContextValue } from './index';

function resolveInitialCitySlug(): string {
    const params = new URLSearchParams(window.location.search);
    const queryCity = params.get('city')?.trim().toLowerCase();
    return queryCity || ENV.DEFAULT_CITY_SLUG;
}

export function TenantProvider({ children }: { children: ReactNode }) {
    const [citySlug] = useState<string>(resolveInitialCitySlug);
    const [tenant, setTenant] = useState<CityTenant | null>(null);
    const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(true);
    const [tenantError, setTenantError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadTenantData() {
            try {
                const data = await fetchCityTenant(citySlug);
                if (!isMounted) return;
                setTenant(data);
                setTenantError(null);
                applyTenantBranding(data);
            } catch (error) {
                console.error(`[HydroGuard] Falha ao carregar tenant "${citySlug}":`, error);
                if (!isMounted) return;
                setTenantError('Não foi possível carregar as configurações do município.');
                applyTenantBranding(null);
            } finally {
                if (isMounted) {
                    setIsLoadingTenant(false);
                }
            }
        }

        void loadTenantData();

        return () => {
            isMounted = false;
        };
    }, [citySlug]);

    const value = useMemo<TenantContextValue>(() => {
        const cityDisplayName = formatCityDisplayName(tenant);

        const bannerUrl =
            tenant?.bannerUrl && tenant.bannerUrl.trim() !== ''
                ? tenant.bannerUrl
                : defaultBannerFallback;

        const logoUrl =
            tenant?.logoUrl && tenant.logoUrl.trim() !== ''
                ? tenant.logoUrl
                : defaultLogoFallback;

        const coordinates: [number, number] = [
            tenant?.mapLat ?? APP_CONFIG.FALLBACK_TENANT.LAT,
            tenant?.mapLng ?? APP_CONFIG.FALLBACK_TENANT.LNG,
        ];

        return {
            citySlug,
            tenant,
            cityDisplayName,
            bannerUrl,
            logoUrl,
            coordinates,
            isLoadingTenant,
            tenantError,
        };
    }, [citySlug, tenant, isLoadingTenant, tenantError]);

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}