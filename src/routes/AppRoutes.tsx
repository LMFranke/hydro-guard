import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { AppProviders } from '../contexts/AppProviders';
import {
    AlertsPage,
    DashboardPage,
    RiskMapsPage,
    StatePortalPage,
    WeatherPage,
} from '../pages';

function CityTenantScopeLayout() {
    const { citySlug } = useParams<{ citySlug: string }>();

    if (!citySlug) {
        return <Navigate to="/" replace />;
    }

    const normalizedSlug = citySlug.trim().toLowerCase();

    return (
        <AppProviders key={normalizedSlug} citySlug={normalizedSlug}>
            <AppLayout />
        </AppProviders>
    );
}

export function AppRoutes() {
    return (
        <Routes>
            {/* Página Geral: Mapa de Santa Catarina com Divisões Municipais */}
            <Route path="/" element={<StatePortalPage />} />

            {/* Plataforma White-Label de cada Município (ex: /rodeio, /blumenau) */}
            <Route path="/:citySlug" element={<CityTenantScopeLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="weather" element={<WeatherPage />} />
                <Route path="maps" element={<RiskMapsPage />} />
                <Route path="alerts" element={<AlertsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}