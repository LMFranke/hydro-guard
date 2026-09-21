import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    CloudRain,
    ShieldAlert,
    Map,
    Menu,
    X,
    Activity
} from 'lucide-react';
import cityLogo from '../assets/logo-rodeio.png';
import './Sidebar.css';

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { path: '/', label: ' Dashboard', icon: LayoutDashboard },
        { path: '/weather', label: ' Weather & Climate', icon: CloudRain },
        { path: '/maps', label: ' Flood Maps', icon: Map },
        { path: '/alerts', label: ' Active Alerts', icon: ShieldAlert },
    ];

    return (
        <>
            <div className="mobile-topbar">
                <div className="mobile-logo">
                    <ShieldAlert size={24} className="text-blue-500" />
                    <span>HYDROGUARD</span>
                </div>
                <button
                    className="mobile-toggle"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="brand-container">
                        <img src={cityLogo} alt="Prefeitura Municipal" className="city-logo" />
                    </div>
                </div>
                <div className="sidebar-brand-text" style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
                    <h2 style={{ color: '#f8fafc', fontSize: '1.1rem', margin: 0, letterSpacing: '1px' }}>HYDROGUARD</h2>
                </div>

                <nav className="sidebar-nav">
                    <span className="nav-group-label">MAIN MENU</span>
                    <ul className="nav-list">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path}>
                                    {}
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Icon size={20} className="nav-icon" />
                                        <span>{item.label}</span>
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <div className="system-status">
                        <Activity size={18} className="status-icon" />
                        <div className="status-text">
                            <span className="status-title">System Status</span>
                            <span className="status-value">Online & Updated</span>
                        </div>
                        <span className="status-dot"></span>
                    </div>
                </div>
            </aside>

            {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}
        </>
    );
}