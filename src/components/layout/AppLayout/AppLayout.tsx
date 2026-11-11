import { Outlet } from 'react-router-dom';
import { Footer } from '../Footer/Footer';
import { PageHeader } from '../PageHeader/PageHeader';
import { Sidebar } from '../Sidebar/Sidebar';
import './AppLayout.css';

export function AppLayout() {
    return (
        <div className="hg-app-container">
            <Sidebar />
            <main className="hg-main-content">
                <PageHeader />
                <Outlet />
                <Footer />
            </main>
        </div>
    );
}