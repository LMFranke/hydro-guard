import { APP_CONFIG } from '../../../config/env';
import { useTenant } from '../../../contexts';
import './Footer.css';

export function Footer() {
    const { tenant, cityDisplayName } = useTenant();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="hg-footer">
            <div className="hg-footer-content">
                <section className="hg-footer-section">
                    <h3 className="hg-footer-title">Defesa Civil</h3>
                    <p>Sistema Integrado de Monitorização e Alerta.</p>
                    <p>Proteção e Defesa do Cidadão de {cityDisplayName}.</p>
                    {tenant?.address && <p>{tenant.address}</p>}
                </section>

                <section className="hg-footer-section">
                    <h3 className="hg-footer-title">Emergência</h3>
                    <ul className="hg-footer-links">
                        <li>
              <span className="hg-phone-number">
                {tenant?.phone || APP_CONFIG.FALLBACK_TENANT.EMERGENCY_PHONE}
              </span>{' '}
                            - Defesa Civil
                        </li>
                        <li>
                            <span className="hg-phone-number">193</span> - Corpo de Bombeiros
                        </li>
                        <li>
                            <span className="hg-phone-number">190</span> - Polícia Militar
                        </li>
                    </ul>
                </section>

                <section className="hg-footer-section">
                    <h3 className="hg-footer-title">Contato e Links</h3>
                    <nav aria-label="Links institucionais do rodapé">
                        <ul className="hg-footer-links">
                            {tenant?.email && (
                                <li>
                                    <a href={`mailto:${tenant.email}`}>{tenant.email}</a>
                                </li>
                            )}
                            <li>
                                <a href="#prefeitura">Portal da Prefeitura</a>
                            </li>
                            <li>
                                <a href="#contingencia">Plano de Contingência</a>
                            </li>
                        </ul>
                    </nav>
                </section>
            </div>

            <div className="hg-footer-bottom">
                <p>
                    &copy; {currentYear} Defesa Civil de {cityDisplayName}. Todos os
                    direitos reservados.
                </p>
            </div>
        </footer>
    );
}