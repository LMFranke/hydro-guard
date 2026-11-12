import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { MonitoringProvider } from './MonitoringContext';
import { TenantProvider } from './TenantContext';

interface AppProvidersProps {
    citySlug: string;
    children: ReactNode;
}

export function AppProviders({ citySlug, children }: AppProvidersProps) {
    return (
        <TenantProvider citySlug={citySlug}>
            <AuthProvider>
                <MonitoringProvider>{children}</MonitoringProvider>
            </AuthProvider>
        </TenantProvider>
    );
}