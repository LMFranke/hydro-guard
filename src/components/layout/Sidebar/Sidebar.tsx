import { useState, type FormEvent } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Activity,
    CloudRain,
    KeyRound,
    LayoutDashboard,
    Lock,
    LogOut,
    Map,
    Menu,
    ShieldAlert,
    UserCheck,
    X,
} from 'lucide-react';
import { useAuth, useTenant } from '../../../contexts';
import { Button, Modal } from '../../ui';
import './Sidebar.css';

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/weather', label: 'Tempo e Clima', icon: CloudRain },
    { path: '/maps', label: 'Mapas de Perigo', icon: Map },
    { path: '/alerts', label: 'Alertas', icon: ShieldAlert },
] as const;

export function Sidebar() {
    const { cityDisplayName, logoUrl } = useTenant();
    const { session, isCoordinator, login, logout, updatePassword } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
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

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            setShowLoginModal(false);
            setEmail('');
            setPassword('');
            setIsOpen(false);
        } catch (error) {
            if (error instanceof Error && error.message.includes('pertence ao município')) {
                setLoginError(error.message);
            } else {
                setLoginError('Credenciais inválidas. Verifique seu e-mail e palavra-passe.');
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
                message: 'Senha atual incorreta ou nova senha inválida (mínimo 6 caracteres).',
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

    return (
        <>
            <div className="hg-mobile-topbar">
                <div className="hg-mobile-logo">
                    <ShieldAlert size={24} className="hg-brand-icon" />
                    <span>HYDROGUARD</span>
                </div>
                <button
                    type="button"
                    className="hg-mobile-toggle"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-label="Alternar menu de navegação"
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            <aside className={`hg-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="hg-sidebar-header">
                    <div className="hg-brand-container">
                        <img
                            src={logoUrl}
                            alt={`Brasão / Logo de ${cityDisplayName}`}
                            className="hg-city-logo"
                        />
                    </div>
                    <h2 className="hg-sidebar-brand-title">HYDROGUARD</h2>
                </div>

                <nav className="hg-sidebar-nav" aria-label="Menu Principal">
                    <span className="hg-nav-group-label">Menu Principal</span>
                    <ul className="hg-nav-list">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `hg-nav-link ${isActive ? 'active' : ''}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Icon size={20} className="hg-nav-icon" />
                                        <span>{item.label}</span>
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

                    <div className="hg-system-status">
                        <Activity size={18} className="hg-status-icon" />
                        <div className="hg-status-text">
                            <span className="hg-status-title">Status do Sistema</span>
                            <span className="hg-status-value">Online</span>
                        </div>
                        <span className="hg-status-dot" />
                    </div>
                </div>
            </aside>

            {isOpen && (
                <div
                    className="hg-sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

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

                    <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
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
                        <label htmlFor="new-password">Nova Senha (mínimo 6 caracteres)</label>
                        <input
                            id="new-password"
                            type="password"
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
                        {isSubmitting ? 'Criptografando...' : 'Atualizar Senha'}
                    </Button>
                </form>
            </Modal>
        </>
    );
}