import { useState, useEffect, useMemo, type ReactNode } from 'react';
import defaultBannerFallback from '../assets/banner-rodeio.png';
import defaultLogoFallback from '../assets/logo-rodeio.png';
import { APP_CONFIG } from '../config/env';
import { fetchCityTenant } from '../services';
import type { CityTenant } from '../types';
import {
    applyTenantBranding,
    CACHE_TTL,
    formatCityDisplayName,
    readCache,
    writeCache,
} from '../utils';
import { TenantContext, type TenantContextValue } from './index';

interface TenantProviderProps {
    citySlug: string;
    children: ReactNode;
}

function findInitialCachedTenant(slug: string): CityTenant | null {
    const directCache = readCache<CityTenant>(`tenant_${slug}`);
    if (directCache) return directCache.data;

    // Aproveita a lista já carregada no Mapa de SC se existir
    const portalList = readCache<CityTenant[]>('portal_cities_list');
    if (portalList) {
        const found = portalList.data.find((c) => c.slug === slug);
        if (found) {
            writeCache(`tenant_${slug}`, found, CACHE_TTL.TENANT_MS);
            return found;
        }
    }

    return null;
}

export function TenantProvider({ citySlug, children }: TenantProviderProps) {
    const [tenant, setTenant] = useState<CityTenant | null>(() =>
        findInitialCachedTenant(citySlug)
    );
    const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(
        () => findInitialCachedTenant(citySlug) === null
    );
    const [tenantError, setTenantError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const cached = readCache<CityTenant>(`tenant_${citySlug}`);

        if (cached) {
            applyTenantBranding(cached.data);
            if (!cached.isExpired) {
                return () => {
                    isMounted = false;
                };
            }
        }

        async function loadTenantData() {
            try {
                const data = await fetchCityTenant(citySlug);
                if (!isMounted) return;
                setTenant(data);
                setTenantError(null);
                writeCache(`tenant_${citySlug}`, data, CACHE_TTL.TENANT_MS);
                applyTenantBranding(data);
            } catch (error) {
                console.error(`[HydroGuard] Falha ao carregar tenant "${citySlug}":`, error);
                if (!isMounted) return;
                setTenantError(`O município "${citySlug}" não está cadastrado na plataforma.`);
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