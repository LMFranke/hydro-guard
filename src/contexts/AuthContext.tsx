import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { APP_CONFIG } from '../config/env';
import {
    ApiError,
    changeCoordinatorPassword,
    loginCoordinator,
} from '../services';
import type { LoginResponseDTO } from '../types';
import { AuthContext, useTenant, type AuthContextValue } from './index';

function readPersistedSession(): LoginResponseDTO | null {
    try {
        const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.COORDINATOR_SESSION);
        if (!saved) return null;
        const parsed = JSON.parse(saved) as LoginResponseDTO;
        if (!parsed?.token || !parsed?.citySlug) return null;
        return parsed;
    } catch {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.COORDINATOR_SESSION);
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const { citySlug } = useTenant();
    const [session, setSession] = useState<LoginResponseDTO | null>(readPersistedSession);

    const isCoordinator = Boolean(session && session.citySlug === citySlug);
    const authToken = isCoordinator ? (session?.token ?? null) : null;

    const logout = useCallback(() => {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.COORDINATOR_SESSION);
        setSession(null);
    }, []);

    const login = useCallback(
        async (email: string, password: string) => {
            const response = await loginCoordinator(email, password);

            if (response.citySlug !== citySlug) {
                throw new Error(
                    `Esta conta pertence ao município de "${response.citySlug}", não a "${citySlug}".`
                );
            }

            localStorage.setItem(
                APP_CONFIG.STORAGE_KEYS.COORDINATOR_SESSION,
                JSON.stringify(response)
            );
            setSession(response);
        },
        [citySlug]
    );

    const updatePassword = useCallback(
        async (currentPassword: string, newPassword: string) => {
            if (!authToken) {
                throw new Error('Sessão inválida. Faça login novamente.');
            }
            await changeCoordinatorPassword(authToken, currentPassword, newPassword);
        },
        [authToken]
    );

    const handleAuthError = useCallback(
        (error: unknown): boolean => {
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                logout();
                return true;
            }
            return false;
        },
        [logout]
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            authToken,
            isCoordinator,
            login,
            logout,
            updatePassword,
            handleAuthError,
        }),
        [session, authToken, isCoordinator, login, logout, updatePassword, handleAuthError]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}