import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    Archive,
    Building2,
    CalendarClock,
    Check,
    CheckCircle,
    Clock,
    Copy,
    History,
    Info,
    Map as MapIcon,
    MapPin,
    Plus,
    Share2,
    ShieldAlert,
} from 'lucide-react';
import { useAuth, useMonitoring, useTenant } from '../../../../contexts';
import type { AlertData, OfficialAlertSeverity } from '../../../../types';
import {
    buildWhatsAppShareUrl,
    formatAlertBulletinText,
    OFFICIAL_ALERT_SEVERITY_LABELS,
} from '../../../../utils';
import { Badge, Button, Modal, type BadgeVariant } from '../../../ui';
import './ActiveAlerts.css';

type AlertsTab = 'ACTIVE' | 'HISTORY';

function renderSeverityIcon(severity: OfficialAlertSeverity) {
    switch (severity) {
        case 'CRITICAL':
            return <ShieldAlert size={24} className="hg-sev-icon-critical" />;
        case 'WARNING':
            return <AlertTriangle size={24} className="hg-sev-icon-warning" />;
        case 'WATCH':
            return <Info size={24} className="hg-sev-icon-watch" />;
    }
}

export function ActiveAlerts() {
    const { citySlug, cityDisplayName } = useTenant();
    const { isCoordinator } = useAuth();
    const { alerts, alertHistory, publishAlert, deactivateAlert } =
        useMonitoring();

    const [activeTab, setActiveTab] = useState<AlertsTab>('ACTIVE');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [severity, setSeverity] = useState<OfficialAlertSeverity>('WARNING');
    const [region, setRegion] = useState('');
    const [source, setSource] = useState('');
    const [validityHours, setValidityHours] = useState<number>(12);
    const [description, setDescription] = useState('');
    const [instructionsText, setInstructionsText] = useState('');

    const handleCopyBulletin = async (alertItem: AlertData) => {
        try {
            const bulletinText = formatAlertBulletinText(alertItem, cityDisplayName);
            await navigator.clipboard.writeText(bulletinText);
            setCopiedAlertId(alertItem.id);
            window.setTimeout(() => {
                setCopiedAlertId((prev) => (prev === alertItem.id ? null : prev));
            }, 2500);
        } catch {
            // Ignora caso o navegador bloqueie área de transferência
        }
    };

    const handleCreateAlert = async (e: FormEvent) => {
        e.preventDefault();
        if (!title || !region || !description) return;

        setFormError(null);
        setIsSubmitting(true);

        try {
            const instructions = instructionsText
                ? instructionsText
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
                : ['Siga as orientações oficiais da Defesa Civil.'];

            await publishAlert({
                title,
                severity,
                region,
                source:
                    source.trim() || `Defesa Civil Municipal de ${cityDisplayName}`,
                validityHours,
                description,
                instructions,
            });

            setTitle('');
            setRegion('');
            setSource('');
            setValidityHours(12);
            setDescription('');
            setInstructionsText('');
            setShowCreateModal(false);
            setActiveTab('ACTIVE');
        } catch {
            setFormError(
                'Erro ao publicar alerta. Verifique se a sua sessão de coordenador ainda é válida.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async (alertId: string) => {
        try {
            await deactivateAlert(alertId);
        } catch {
            // Caso o token tenha expirado, o AuthContext limpa a sessão
        }
    };

    const displayedList = activeTab === 'ACTIVE' ? alerts : alertHistory;

    return (
        <section className="hg-surface-section" aria-labelledby="alerts-title">
            <header className="hg-section-header">
                <div>
                    <h2 id="alerts-title" className="hg-section-title">
                        Central de Alertas e Histórico de Ocorrências
                    </h2>
                    <p className="hg-section-subtitle">
                        Avisos oficiais com rastreabilidade de origem, validade e área
                        afetada em {cityDisplayName}.
                    </p>
                </div>

                <div className="hg-alerts-top-actions">
                    <div className="hg-alerts-tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'ACTIVE'}
                            className={`hg-alerts-tab-btn ${
                                activeTab === 'ACTIVE' ? 'is-active' : ''
                            }`}
                            onClick={() => setActiveTab('ACTIVE')}
                        >
                            <ShieldAlert size={16} />
                            <span>Alertas Ativos ({alerts.length})</span>
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'HISTORY'}
                            className={`hg-alerts-tab-btn ${
                                activeTab === 'HISTORY' ? 'is-active' : ''
                            }`}
                            onClick={() => setActiveTab('HISTORY')}
                        >
                            <History size={16} />
                            <span>Histórico ({alertHistory.length})</span>
                        </button>
                    </div>

                    {isCoordinator && (
                        <Button
                            variant="primary"
                            leftIcon={<Plus size={18} />}
                            onClick={() => {
                                setFormError(null);
                                setSource(`Defesa Civil Municipal (${cityDisplayName})`);
                                setShowCreateModal(true);
                            }}
                        >
                            Novo Alerta
                        </Button>
                    )}
                </div>
            </header>

            {displayedList.length === 0 ? (
                <div className="hg-no-alerts">
                    {activeTab === 'ACTIVE' ? (
                        <>
                            <ShieldAlert size={48} className="hg-sev-icon-safe" />
                            <h3>Nenhum Alerta Ativo no Momento</h3>
                            <p>
                                Não há ocorrências vigentes para {cityDisplayName}. Você pode
                                consultar alertas anteriores na aba{' '}
                                <strong>Histórico ({alertHistory.length})</strong>.
                            </p>
                        </>
                    ) : (
                        <>
                            <Archive size={48} className="hg-sev-icon-watch" />
                            <h3>Nenhum Registro no Histórico</h3>
                            <p>
                                Alertas encerrados pelo operador ou que atingirem o prazo de
                                validade ficarão arquivados e consultáveis aqui.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="hg-alerts-list">
                    {displayedList.map((alertItem) => {
                        const severityKey =
                            alertItem.severity.toLowerCase() as BadgeVariant;
                        const isCopied = copiedAlertId === alertItem.id;
                        const isHistorical = alertItem.lifecycleStatus !== 'ACTIVE';
                        const whatsAppUrl = buildWhatsAppShareUrl(
                            alertItem,
                            cityDisplayName
                        );

                        return (
                            <article
                                key={alertItem.id}
                                className={`hg-alert-card severity-${severityKey} ${
                                    isHistorical ? 'is-historical-card' : ''
                                }`}
                            >
                                <header className="hg-alert-card-header">
                                    <div className="hg-alert-title-group">
                                        {renderSeverityIcon(alertItem.severity)}
                                        <div>
                                            <h3 className="hg-alert-title">{alertItem.title}</h3>
                                            <span className="hg-alert-source-line">
                        <Building2 size={13} /> Origem: {alertItem.source}
                      </span>
                                        </div>
                                    </div>

                                    <div className="hg-alert-header-actions">
                                        {alertItem.lifecycleStatus === 'ACTIVE' && (
                                            <Badge variant="normal">VIGENTE / ATIVO</Badge>
                                        )}
                                        {alertItem.lifecycleStatus === 'CLOSED' && (
                                            <Badge variant="neutral">ENCERRADO PELO OPERADOR</Badge>
                                        )}
                                        {alertItem.lifecycleStatus === 'EXPIRED' && (
                                            <Badge variant="watch">PRAZO EXPIRADO</Badge>
                                        )}

                                        <Badge variant={severityKey}>
                                            Severidade:{' '}
                                            {OFFICIAL_ALERT_SEVERITY_LABELS[alertItem.severity]}
                                        </Badge>

                                        {isCoordinator && alertItem.lifecycleStatus === 'ACTIVE' && (
                                            <Button
                                                variant="danger-soft"
                                                size="sm"
                                                leftIcon={<CheckCircle size={14} />}
                                                onClick={() => handleDeactivate(alertItem.id)}
                                                title="Encerrar Alerta e Mover para o Histórico"
                                            >
                                                Encerrar Alerta
                                            </Button>
                                        )}
                                    </div>
                                </header>

                                <div className="hg-alert-meta">
                  <span className="hg-meta-item hg-meta-region-highlight">
                    <MapPin size={15} />
                    <strong>Área Afetada:</strong> {alertItem.region}
                  </span>

                                    <span className="hg-meta-item">
                    <Clock size={15} />
                    <strong>Emissão:</strong> {alertItem.issuedAt}
                  </span>

                                    <span className="hg-meta-item">
                    <Clock size={15} />
                    <strong>Última atualização:</strong> {alertItem.updatedAt}
                  </span>

                                    {alertItem.expiresAt && (
                                        <span className="hg-meta-item">
                      <CalendarClock size={15} />
                      <strong>Validade:</strong> {alertItem.expiresAt}
                    </span>
                                    )}

                                    {alertItem.closedAt && (
                                        <span className="hg-meta-item">
                      <CheckCircle size={15} />
                      <strong>Encerrado em:</strong> {alertItem.closedAt}
                    </span>
                                    )}
                                </div>

                                <p className="hg-alert-description">{alertItem.description}</p>

                                <div className="hg-alert-instructions">
                                    <h4>Orientações de Segurança à População:</h4>
                                    <ul>
                                        {alertItem.instructions.map((instruction, index) => (
                                            <li key={index}>{instruction}</li>
                                        ))}
                                    </ul>
                                </div>

                                <footer className="hg-alert-share-footer">
                                    <Link
                                        to={`/${citySlug}/maps`}
                                        className="hg-alert-map-link"
                                        title="Visualizar marcação deste alerta no Mapa de Perigo"
                                    >
                                        <MapIcon size={14} />
                                        <span>Ver Área Afetada no Mapa</span>
                                    </Link>

                                    <div className="hg-alert-share-btns">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={
                                                isCopied ? <Check size={14} /> : <Copy size={14} />
                                            }
                                            onClick={() => handleCopyBulletin(alertItem)}
                                            title="Copiar boletim formatado para área de transferência"
                                        >
                                            {isCopied ? 'Comunicado Copiado!' : 'Copiar Comunicado'}
                                        </Button>

                                        {alertItem.lifecycleStatus === 'ACTIVE' && (
                                            <a
                                                href={whatsAppUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hg-whatsapp-link"
                                                title="Compartilhar alerta oficial no WhatsApp"
                                            >
                                                <Share2 size={14} />
                                                <span>Compartilhar no WhatsApp</span>
                                            </a>
                                        )}
                                    </div>
                                </footer>
                            </article>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Emitir Novo Alerta Oficial"
            >
                <form onSubmit={handleCreateAlert} className="hg-form">
                    {formError && <div className="hg-alert-banner error">{formError}</div>}

                    <div className="hg-form-group">
                        <label htmlFor="alert-title-input">Título da Ocorrência</label>
                        <input
                            id="alert-title-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Risco de Transbordo e Alagamento"
                            required
                        />
                    </div>

                    <div className="hg-form-row-2">
                        <div className="hg-form-group">
                            <label htmlFor="alert-severity-select">Nível de Gravidade</label>
                            <select
                                id="alert-severity-select"
                                value={severity}
                                onChange={(e) =>
                                    setSeverity(e.target.value as OfficialAlertSeverity)
                                }
                            >
                                <option value="WATCH">Atenção (Amarelo)</option>
                                <option value="WARNING">Alerta (Laranja)</option>
                                <option value="CRITICAL">Crítico / Emergência (Vermelho)</option>
                            </select>
                        </div>

                        <div className="hg-form-group">
                            <label htmlFor="alert-validity-select">Prazo de Validade</label>
                            <select
                                id="alert-validity-select"
                                value={validityHours}
                                onChange={(e) => setValidityHours(Number(e.target.value))}
                            >
                                <option value={6}>6 horas</option>
                                <option value={12}>12 horas (Padrão)</option>
                                <option value={24}>24 horas</option>
                                <option value={48}>48 horas</option>
                                <option value={72}>72 horas</option>
                            </select>
                        </div>
                    </div>

                    <div className="hg-form-row-2">
                        <div className="hg-form-group">
                            <label htmlFor="alert-region-input">Região / Área Afetada</label>
                            <input
                                id="alert-region-input"
                                type="text"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                placeholder="Ex: Bairro Centro e Margens do Rio"
                                required
                            />
                        </div>

                        <div className="hg-form-group">
                            <label htmlFor="alert-source-input">Órgão Emissor (Origem)</label>
                            <input
                                id="alert-source-input"
                                type="text"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                placeholder={`Defesa Civil de ${cityDisplayName}`}
                                required
                            />
                        </div>
                    </div>

                    <div className="hg-form-group">
                        <label htmlFor="alert-desc-input">Descrição do Evento</label>
                        <textarea
                            id="alert-desc-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva a situação hidrometeorológica atual..."
                            rows={3}
                            required
                        />
                    </div>

                    <div className="hg-form-group">
                        <label htmlFor="alert-instructions-input">
                            Orientações de Segurança (uma por linha)
                        </label>
                        <textarea
                            id="alert-instructions-input"
                            value={instructionsText}
                            onChange={(e) => setInstructionsText(e.target.value)}
                            placeholder={
                                'Evite transitar em áreas alagadas\nDesligue a rede elétrica em caso de avanço da água\nAcione o 199 em caso de emergência'
                            }
                            rows={3}
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Publicando...' : 'Publicar Alerta Oficial'}
                    </Button>
                </form>
            </Modal>
        </section>
    );
}