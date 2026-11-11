import { APP_CONFIG } from '../config/env';
import type { CityTenant } from '../types';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Valida se a cor enviada pelo backend é um hexadecimal válido.
 */
export function isValidHexColor(color: string | null | undefined): color is string {
    if (!color) return false;
    return HEX_COLOR_REGEX.test(color.trim());
}

/**
 * Injeta as variáveis CSS de tema do município no elemento :root do documento
 * e atualiza o título da página para refletir o Tenant atual.
 */
export function applyTenantBranding(tenant: CityTenant | null): void {
    const root = document.documentElement;
    const primaryColor = isValidHexColor(tenant?.themeColor)
        ? tenant.themeColor.trim()
        : APP_CONFIG.FALLBACK_TENANT.THEME_COLOR;

    root.style.setProperty('--brand-primary', primaryColor);

    if (tenant) {
        document.title = `HydroGuard | Defesa Civil de ${tenant.name} - ${tenant.state}`;
    } else {
        document.title = 'HydroGuard | Monitoramento e Defesa Civil';
    }
}

/**
 * Formata o nome de exibição padrão do município (ex: "Rodeio - SC").
 */
export function formatCityDisplayName(tenant: CityTenant | null | undefined): string {
    if (!tenant) {
        return `${APP_CONFIG.FALLBACK_TENANT.NAME} - ${APP_CONFIG.FALLBACK_TENANT.STATE}`;
    }
    return `${tenant.name} - ${tenant.state}`;
}