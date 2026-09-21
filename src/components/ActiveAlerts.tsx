import { useState, type FormEvent } from 'react';
import { ShieldAlert, AlertTriangle, Info, MapPin, Clock, Lock, LogOut, Plus, X } from 'lucide-react';
import './ActiveAlerts.css';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'WATCH';

export interface AlertData {
    id: string;
    title: string;
    severity: AlertSeverity;
    region: string;
    description: string;
    instructions: string[];
    issuedAt: string;
}

interface ActiveAlertsProps {
    alerts: AlertData[];
    onAddAlert: (newAlert: Omit<AlertData, 'id' | 'issuedAt'>) => void;
}

export function ActiveAlerts({ alerts, onAddAlert }: ActiveAlertsProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [title, setTitle] = useState('');
    const [severity, setSeverity] = useState<AlertSeverity>('WARNING');
    const [region, setRegion] = useState('');
    const [description, setDescription] = useState('');
    const [instructionsText, setInstructionsText] = useState('');

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        if (email === 'lucasmfranke@gmail.com' && password === '123456') {
            setIsAuthenticated(true);
            setShowLoginModal(false);
            setEmail('');
            setPassword('');
            setLoginError('');
        } else {
            setLoginError('Credenciais inválidas.');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    const handleCreateAlert = (e: FormEvent) => {
        e.preventDefault();
        if (!title || !region || !description) return;

        const instructions = instructionsText
            ? instructionsText.split('\n').filter(item => item.trim() !== '')
            : ['Siga as orientações oficiais da Defesa Civil.'];

        onAddAlert({
            title,
            severity,
            region,
            description,
            instructions
        });

        setTitle('');
        setRegion('');
        setDescription('');
        setInstructionsText('');
        setShowCreateModal(false);
    };

    const getSeverityIcon = (sev: AlertSeverity) => {
        switch (sev) {
            case 'CRITICAL': return <ShieldAlert size={24} className="text-red-600" />;
            case 'WARNING': return <AlertTriangle size={24} className="text-orange-500" />;
            case 'WATCH': return <Info size={24} className="text-yellow-500" />;
        }
    };

    const severityLabels: Record<AlertSeverity, string> = {
        CRITICAL: 'CRÍTICO',
        WARNING: 'ALERTA',
        WATCH: 'ATENÇÃO'
    };

    return (
        <section className="alerts-section" aria-labelledby="alerts-title">
            <header className="alerts-header-flex">
                <div>
                    <h2 id="alerts-title" className="section-title">Alertas e Ocorrências Ativas</h2>
                    <p className="section-subtitle">Avisos oficiais emitidos pela Defesa Civil de Rodeio - SC.</p>
                </div>

                <div className="auth-action-container">
                    {!isAuthenticated ? (
                        <button className="login-btn" onClick={() => setShowLoginModal(true)}>
                            <Lock size={16} /> Área do Coordenador
                        </button>
                    ) : (
                        <div className="admin-logged-group">
                            <span className="admin-tag">Modo Gestão Ativo</span>
                            <button className="create-alert-btn" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} /> Novo Alerta
                            </button>
                            <button className="logout-btn" onClick={handleLogout} title="Terminar Sessão">
                                <LogOut size={16} /> Sair
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {alerts.length === 0 ? (
                <div className="no-alerts">
                    <ShieldAlert size={48} className="text-green-500" />
                    <h3>Nenhum Alerta Ativo</h3>
                    <p>No momento, não há ocorrências críticas registradas no município.</p>
                </div>
            ) : (
                <div className="alerts-list">
                    {alerts.map((alert) => {
                        const severityClass = alert.severity.toLowerCase();

                        return (
                            <article key={alert.id} className={`alert-card border-${severityClass}`}>
                                <header className="alert-card-header">
                                    <div className="alert-title-group">
                                        {getSeverityIcon(alert.severity)}
                                        <h3 className="alert-title">{alert.title}</h3>
                                    </div>
                                    <span className={`alert-badge bg-${severityClass}`}>
                    {severityLabels[alert.severity]}
                  </span>
                                </header>

                                <div className="alert-meta">
                  <span className="meta-item">
                    <MapPin size={16} /> {alert.region}
                  </span>
                                    <span className="meta-item">
                    <Clock size={16} /> Emitido em: {alert.issuedAt}
                  </span>
                                </div>

                                <p className="alert-description">{alert.description}</p>

                                <div className="alert-instructions">
                                    <h4>Orientações de Segurança:</h4>
                                    <ul>
                                        {alert.instructions.map((instruction, index) => (
                                            <li key={index}>{instruction}</li>
                                        ))}
                                    </ul>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            { }
            {showLoginModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <header className="modal-header">
                            <h3>Acesso Restrito - Coordenador</h3>
                            <button className="close-btn" onClick={() => setShowLoginModal(false)}>
                                <X size={20} />
                            </button>
                        </header>
                        <form onSubmit={handleLogin} className="modal-form">
                            {loginError && <div className="error-message">{loginError}</div>}

                            <div className="form-group">
                                <label>E-mail Institucional</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ex: coordenador@hydroguard.sc"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Palavra-passe</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="******"
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn">Entrar no Sistema</button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL DE CRIAÇÃO DE ALERTA --- */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <header className="modal-header">
                            <h3>Emitir Novo Alerta Oficial</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                                <X size={20} />
                            </button>
                        </header>
                        <form onSubmit={handleCreateAlert} className="modal-form">
                            <div className="form-group">
                                <label>Título da Ocorrência</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Risco de Transbordo no Rio Benedito"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Nível de Severidade</label>
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                                >
                                    <option value="WATCH">Atenção (Amarelo)</option>
                                    <option value="WARNING">Alerta (Laranja)</option>
                                    <option value="CRITICAL">Crítico / Emergência (Vermelho)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Região / Bairro Afetado</label>
                                <input
                                    type="text"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                    placeholder="Ex: Centro / Margens do Rio"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrição do Evento</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descreva a situação climática atual..."
                                    rows={3}
                                    required
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>Orientações de Segurança (uma por linha)</label>
                                <textarea
                                    value={instructionsText}
                                    onChange={(e) => setInstructionsText(e.target.value)}
                                    placeholder="Evite transitar em áreas alagadas&#10;Ligue 199 em caso de emergência"
                                    rows={3}
                                ></textarea>
                            </div>

                            <button type="submit" className="submit-btn">Publicar Alerta</button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}