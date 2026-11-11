import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import {
    AlertsPage,
    DashboardPage,
    RiskMapsPage,
    WeatherPage,
} from '../pages';

export function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="weather" element={<WeatherPage />} />
                <Route path="maps" element={<RiskMapsPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}