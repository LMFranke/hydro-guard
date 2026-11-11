import { APP_CONFIG, ENV } from '../config/env';
import type { LoginResponseDTO } from '../types';

export class ApiError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly details?: unknown;

    constructor(status: number, statusText: string, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
        this.details = details;
    }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    token?: string | null;
    requiresAuth?: boolean;
    baseUrl?: string;
}

/**
 * Recupera o token salvo na sessão caso não tenha sido passado explicitamente.
 */
function getStoredToken(): string | null {
    try {
        const rawSession = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.COORDINATOR_SESSION);
        if (!rawSession) return null;
        const session = JSON.parse(rawSession) as LoginResponseDTO;
        return session?.token ?? null;
    } catch {
        return null;
    }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
        body,
        token,
        requiresAuth = false,
        baseUrl = ENV.API_BASE_URL,
        headers: customHeaders,
        ...restOptions
    } = options;

    const headers = new Headers(customHeaders);

    if (body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const effectiveToken = token ?? (requiresAuth ? getStoredToken() : null);
    if (effectiveToken) {
        headers.set('Authorization', `Bearer ${effectiveToken}`);
    }

    const url = endpoint.startsWith('http')
        ? endpoint
        : `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    const response = await fetch(url, {
        ...restOptions,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let errorDetails: unknown = null;
        let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;

        try {
            const contentType = response.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
                errorDetails = await response.json();
                if (
                    errorDetails &&
                    typeof errorDetails === 'object' &&
                    'message' in errorDetails &&
                    typeof (errorDetails as { message: unknown }).message === 'string'
                ) {
                    errorMessage = (errorDetails as { message: string }).message;
                }
            } else {
                const text = await response.text();
                if (text) errorMessage = text;
            }
        } catch {
            // Ignora erro de parse no corpo de erro e mantém mensagem padrão
        }

        throw new ApiError(response.status, response.statusText, errorMessage, errorDetails);
    }

    // Trata respostas sem conteúdo (204 No Content ou body vazio em PATCH/DELETE)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export const httpClient = {
    get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'POST', body }),

    put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'PUT', body }),

    patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'PATCH', body }),

    delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(endpoint, { ...options, method: 'DELETE' }),
};