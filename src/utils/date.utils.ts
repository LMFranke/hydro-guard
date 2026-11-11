import { APP_CONFIG } from '../config/env';

const WEEK_DAYS_PT_BR = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
] as const;

/**
 * Normaliza timestamps da ANA (ex: "2026-10-15 14:00:00.0") para ISO 8601 válido.
 */
export function normalizeAnaTimestamp(raw: string | null): string {
    if (!raw) return new Date().toISOString();
    return raw.trim().replace(' ', 'T').replace(/\.0$/, '');
}

/**
 * Extrai "HH:mm" de uma string de data/hora da ANA ou ISO.
 */
export function extractHourMinute(raw: string | null): string {
    if (!raw) return '--:--';

    const normalized = raw.trim();
    if (normalized.includes(' ')) {
        const timePart = normalized.split(' ')[1];
        return timePart ? timePart.slice(0, 5) : '--:--';
    }

    if (normalized.includes('T')) {
        const timePart = normalized.split('T')[1];
        return timePart ? timePart.slice(0, 5) : '--:--';
    }

    return normalized.slice(0, 5);
}

/**
 * Formata uma data ISO para o padrão de leitura rápida dos cards ("DD/MM, HH:mm").
 */
export function formatShortDateTimePtBr(isoString: string): string {
    const dateObj = new Date(isoString);
    if (Number.isNaN(dateObj.getTime())) return '--/-- --:--';

    return dateObj.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formata a data de emissão de alertas ("DD/MM/YYYY às HH:mm").
 */
export function formatAlertIssuedAt(createdAt: string): string {
    const dateObj = new Date(createdAt);
    if (Number.isNaN(dateObj.getTime())) return createdAt;

    const datePart = dateObj.toLocaleDateString('pt-BR');
    const timePart = dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `${datePart} às ${timePart}`;
}

/**
 * Retorna a data de hoje no formato "YYYY-MM-DD" respeitando o fuso configurado.
 */
export function getTodayIsoDate(timeZone = APP_CONFIG.DEFAULT_TIMEZONE): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone });
}

/**
 * Converte uma string "YYYY-MM-DD" em data curta ("DD/MM") e nome do dia da semana.
 */
export function parseIsoDateToForecastMeta(isoDate: string): {
    formattedDate: string;
    dayOfWeek: string;
} {
    const [year, month, day] = isoDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    return {
        formattedDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
        dayOfWeek: WEEK_DAYS_PT_BR[dateObj.getDay()] ?? '',
    };
}