import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { MonitoringProvider } from './MonitoringContext';
import { TenantProvider } from './TenantContext';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <TenantProvider>
            <AuthProvider>
                <MonitoringProvider>{children}</MonitoringProvider>
            </AuthProvider>
        </TenantProvider>
    );
}