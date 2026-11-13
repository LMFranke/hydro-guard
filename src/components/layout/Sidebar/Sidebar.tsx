import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
    Activity,
    CloudRain,
    Compass,
    KeyRound,
    LayoutDashboard,
    Lock,
    LogOut,
    Map,
    Radio,
    RefreshCw,
    Server,
    ShieldAlert,
    UserCheck,
} from 'lucide-react';
import { useAuth, useMonitoring, useTenant } from '../../../contexts';
import type { ServiceOperationalStatus } from '../../../types';
import { getHighestAlertSeverity } from '../../../utils';
import { Button, Modal } from '../../ui';
import defaultLogoFallback from '../../../assets/favicon.svg';

import './Sidebar.css';

const STATUS_UI_MAP: Record<
    ServiceOperationalStatus,
    { label: string; cssClass: string }
> = {
    ONLINE: { label: 'Online', cssClass: 'online' },
    INSTABLE: { label: 'Instável', cssClass: 'instable' },
    OFFLINE: { label: 'Offline', cssClass: 'offline' },
    CHECKING: { label: 'Verificando...', cssClass: 'checking' },
};

export function Sidebar() {
    const { citySlug, cityDisplayName, logoUrl } = useTenant();
    const { session, isCoordinator, login, logout, updatePassword } = useAuth();
    const { alerts, systemHealth, checkSystemHealthNow } = useMonitoring();

    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<{
        type: 'error' | 'success';
        message: string;
    } | null>(null);

    const highestAlertSeverity = getHighestAlertSeverity(alerts);

    const navItems = [
        { path: `/${citySlug}`, label: 'Dashboard', icon: LayoutDashboard, end: true },
        { path: `/${citySlug}/weather`, label: 'Tempo e Clima', icon: CloudRain, end: false },
        { path: `/${citySlug}/maps`, label: 'Mapas de Perigo', icon: Map, end: false },
        { path: `/${citySlug}/alerts`, label: 'Alertas', icon: ShieldAlert, end: false },
    ];

    const handleManualHealthCheck = async () => {
        setIsCheckingHealth(true);
        try {
            await checkSystemHealthNow();
        } finally {
            setIsCheckingHealth(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            setShowLoginModal(false);
            setEmail('');
            setPassword('');
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes('pertence ao município')
            ) {
                setLoginError(error.message);
            } else {
                setLoginError(
                    'Credenciais inválidas. Verifique seu e-mail e palavra-passe.'
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordFeedback(null);
        setIsSubmitting(true);

        try {
            await updatePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setPasswordFeedback({
                type: 'success',
                message: 'Senha atualizada e criptografada com sucesso!',
            });
        } catch {
            setPasswordFeedback({
                type: 'error',
                message:
                    'Senha atual incorreta ou nova senha inválida (mínimo 6 caracteres).',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const closePasswordModal = () => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setPasswordFeedback(null);
    };

    const backendMeta = STATUS_UI_MAP[systemHealth.backendStatus];
    const anaMeta = STATUS_UI_MAP[systemHealth.anaApiStatus];

    return (
        <>
            <aside className="hg-sidebar">
                <div className="hg-sidebar-header">
                    <div className="hg-brand-container">
                        <img
                            src={logoUrl}
                            alt={`Brasão / Logo de ${cityDisplayName}`}
                            className="hg-city-logo"
                            onError={(e) => {
                                if (e.currentTarget.src !== defaultLogoFallback) {
                                    e.currentTarget.src = defaultLogoFallback;
                                }
                            }}
                        />
                    </div>
                    <h2 className="hg-sidebar-brand-title">HYDROGUARD</h2>
                    <Link to="/" className="hg-state-portal-link" title="Voltar ao Mapa de Santa Catarina">
                        <Compass size={14} />
                        <span>Mapa de Santa Catarina</span>
                    </Link>
                </div>

                <nav className="hg-sidebar-nav" aria-label="Menu Principal">
                    <span className="hg-nav-group-label">Menu Principal</span>
                    <ul className="hg-nav-list">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isAlertsRoute = item.path.endsWith('/alerts');
                            const showAlertBadge =
                                isAlertsRoute && alerts.length > 0 && highestAlertSeverity;

                            return (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        end={item.end}
                                        className={({ isActive }) =>
                                            `hg-nav-link ${isActive ? 'active' : ''}`
                                        }
                                    >
                                        <Icon size={20} className="hg-nav-icon" />
                                        <span className="hg-nav-link-label">{item.label}</span>
                                        {showAlertBadge && (
                                            <span
                                                className={`hg-nav-alert-chip ${highestAlertSeverity.toLowerCase()}`}
                                                title={`${alerts.length} alerta(s) ativo(s)`}
                                            >
                        <span className="hg-nav-alert-dot" />
                        <span className="hg-nav-alert-count">
                          {alerts.length}
                        </span>
                      </span>
                                        )}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="hg-sidebar-footer">
          <span className="hg-nav-group-label" style={{ marginBottom: 0 }}>
            Administração
          </span>

                    {!isCoordinator ? (
                        <button
                            type="button"
                            className="hg-sidebar-login-btn"
                            onClick={() => {
                                setLoginError('');
                                setShowLoginModal(true);
                            }}
                        >
                            <Lock size={16} />
                            <span>Área do Coordenador</span>
                        </button>
                    ) : (
                        <div className="hg-coordinator-box">
                            <div className="hg-coordinator-info">
                                <div className="hg-coordinator-avatar">
                                    <UserCheck size={18} />
                                </div>
                                <div className="hg-coordinator-details">
                  <span className="hg-coordinator-name" title={session?.name}>
                    {session?.name}
                  </span>
                                    <span className="hg-coordinator-role">
                    Coordenador • {cityDisplayName}
                  </span>
                                </div>
                            </div>

                            <div className="hg-coordinator-actions">
                                <button
                                    type="button"
                                    className="hg-sidebar-action-btn"
                                    onClick={() => {
                                        setPasswordFeedback(null);
                                        setShowPasswordModal(true);
                                    }}
                                    title="Alterar Senha"
                                >
                                    <KeyRound size={14} /> Senha
                                </button>
                                <button
                                    type="button"
                                    className="hg-sidebar-action-btn danger"
                                    onClick={logout}
                                    title="Encerrar Sessão"
                                >
                                    <LogOut size={14} /> Sair
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        className="hg-system-status-card"
                        title={systemHealth.message}
                    >
                        <div className="hg-status-card-header">
              <span className="hg-status-card-title">
                <Activity size={13} />
                Diagnóstico de Rede
              </span>
                            <button
                                type="button"
                                className={`hg-status-refresh-btn ${
                                    isCheckingHealth ? 'spinning' : ''
                                }`}
                                onClick={handleManualHealthCheck}
                                disabled={isCheckingHealth}
                                title="Verificar status dos serviços agora"
                                aria-label="Verificar status dos serviços agora"
                            >
                                <RefreshCw size={13} />
                            </button>
                        </div>

                        <div className="hg-status-rows">
                            <div className="hg-status-row">
                <span className="hg-status-service-name">
                  <Server size={14} />
                  Sistema
                </span>
                                <span className={`hg-status-pill ${backendMeta.cssClass}`}>
                  <span>{backendMeta.label}</span>
                  <span className={`hg-status-dot ${backendMeta.cssClass}`} />
                </span>
                            </div>

                            <div className="hg-status-row">
                <span className="hg-status-service-name">
                  <Radio size={14} />
                  API da ANA
                </span>
                                <span className={`hg-status-pill ${anaMeta.cssClass}`}>
                  {systemHealth.anaLatencyMs !== null &&
                      systemHealth.anaApiStatus !== 'OFFLINE' && (
                          <span className="hg-status-latency">
                        ({systemHealth.anaLatencyMs}ms)
                      </span>
                      )}
                                    <span>{anaMeta.label}</span>
                  <span className={`hg-status-dot ${anaMeta.cssClass}`} />
                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <Modal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title={`Acesso Restrito - ${cityDisplayName}`}
            >
                <form onSubmit={handleLogin} className="hg-form">
                    {loginError && <div className="hg-alert-banner error">{loginError}</div>}

                    <div className="hg-form-group">
                        <label htmlFor="coord-email">E-mail Institucional</label>
                        <input
                            id="coord-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ex: coordenador@hydroguard.sc"
                            required
                        />
                    </div>

                    <div className="hg-form-group">
                        <label htmlFor="coord-password">Palavra-passe</label>
                        <input
                            id="coord-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="******"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
                    </Button>
                </form>
            </Modal>

            <Modal
                isOpen={showPasswordModal}
                onClose={closePasswordModal}
                title="Alterar Senha do Coordenador"
            >
                <form onSubmit={handleChangePassword} className="hg-form">
                    {passwordFeedback && (
                        <div className={`hg-alert-banner ${passwordFeedback.type}`}>
                            {passwordFeedback.message}
                        </div>
                    )}

                    <div className="hg-form-group">
                        <label htmlFor="current-password">Senha Atual</label>
                        <input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="hg-form-group">
                        <label htmlFor="new-password">
                            Nova Senha (mínimo 6 caracteres)
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Criptografando...' : 'Atualizar Senha'}
                    </Button>
                </form>
            </Modal>
        </>
    );
}