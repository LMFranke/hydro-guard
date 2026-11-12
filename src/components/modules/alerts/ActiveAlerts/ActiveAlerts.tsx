import { useState, type FormEvent } from 'react';
import {
    AlertTriangle,
    Check,
    CheckCircle,
    Clock,
    Copy,
    Info,
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
    const { cityDisplayName } = useTenant();
    const { isCoordinator } = useAuth();
    const { alerts, publishAlert, deactivateAlert } = useMonitoring();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [severity, setSeverity] = useState<OfficialAlertSeverity>('WARNING');
    const [region, setRegion] = useState('');
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
                ? instructionsText.split('\n').filter((item) => item.trim() !== '')
                : ['Siga as orientações oficiais da Defesa Civil.'];

            await publishAlert({
                title,
                severity,
                region,
                description,
                instructions,
            });

            setTitle('');
            setRegion('');
            setDescription('');
            setInstructionsText('');
            setShowCreateModal(false);
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
            // Caso o token tenha expirado, o AuthContext já limpa a sessão automaticamente
        }
    };

    return (
        <section className="hg-surface-section" aria-labelledby="alerts-title">
            <header className="hg-section-header">
                <div>
                    <h2 id="alerts-title" className="hg-section-title">
                        Alertas e Ocorrências Ativas
                    </h2>
                    <p className="hg-section-subtitle">
                        Avisos oficiais emitidos pela Defesa Civil de {cityDisplayName}.
                    </p>
                </div>

                {isCoordinator && (
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={18} />}
                        onClick={() => {
                            setFormError(null);
                            setShowCreateModal(true);
                        }}
                    >
                        Novo Alerta
                    </Button>
                )}
            </header>

            {alerts.length === 0 ? (
                <div className="hg-no-alerts">
                    <ShieldAlert size={48} className="hg-sev-icon-safe" />
                    <h3>Nenhum Alerta Ativo</h3>
                    <p>
                        No momento, não há ocorrências críticas registradas no município.
                    </p>
                </div>
            ) : (
                <div className="hg-alerts-list">
                    {alerts.map((alertItem) => {
                        const severityKey =
                            alertItem.severity.toLowerCase() as BadgeVariant;
                        const isCopied = copiedAlertId === alertItem.id;
                        const whatsAppUrl = buildWhatsAppShareUrl(
                            alertItem,
                            cityDisplayName
                        );

                        return (
                            <article
                                key={alertItem.id}
                                className={`hg-alert-card severity-${severityKey}`}
                            >
                                <header className="hg-alert-card-header">
                                    <div className="hg-alert-title-group">
                                        {renderSeverityIcon(alertItem.severity)}
                                        <h3 className="hg-alert-title">{alertItem.title}</h3>
                                    </div>

                                    <div className="hg-alert-header-actions">
                                        <Badge variant={severityKey}>
                                            {OFFICIAL_ALERT_SEVERITY_LABELS[alertItem.severity]}
                                        </Badge>

                                        {isCoordinator && (
                                            <Button
                                                variant="danger-soft"
                                                size="sm"
                                                leftIcon={<CheckCircle size={14} />}
                                                onClick={() => handleDeactivate(alertItem.id)}
                                                title="Encerrar Alerta"
                                            >
                                                Encerrar
                                            </Button>
                                        )}
                                    </div>
                                </header>

                                <div className="hg-alert-meta">
                  <span className="hg-meta-item">
                    <MapPin size={16} /> {alertItem.region}
                  </span>
                                    <span className="hg-meta-item">
                    <Clock size={16} /> Emitido em: {alertItem.issuedAt}
                  </span>
                                </div>

                                <p className="hg-alert-description">{alertItem.description}</p>

                                <div className="hg-alert-instructions">
                                    <h4>Orientações de Segurança:</h4>
                                    <ul>
                                        {alertItem.instructions.map((instruction, index) => (
                                            <li key={index}>{instruction}</li>
                                        ))}
                                    </ul>
                                </div>

                                <footer className="hg-alert-share-footer">
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
                            placeholder="Ex: Risco de Transbordo no Rio Benedito"
                            required
                        />
                    </div>

                    <div className="hg-form-group">
                        <label htmlFor="alert-severity-select">Nível de Severidade</label>
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
                        <label htmlFor="alert-region-input">Região / Bairro Afetado</label>
                        <input
                            id="alert-region-input"
                            type="text"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            placeholder="Ex: Centro / Margens do Rio"
                            required
                        />
                    </div>

                    <div className="hg-form-group">
                        <label htmlFor="alert-desc-input">Descrição do Evento</label>
                        <textarea
                            id="alert-desc-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva a situação climática atual..."
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
                                'Evite transitar em áreas alagadas\nLigue 199 em caso de emergência'
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
                        {isSubmitting ? 'Publicando...' : 'Publicar Alerta'}
                    </Button>
                </form>
            </Modal>
        </section>
    );
}