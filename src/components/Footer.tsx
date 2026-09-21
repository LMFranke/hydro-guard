import './Footer.css';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="footer-content">
                <section className="footer-section">
                    <h3 className="footer-title">Defesa Civil</h3>
                    <p>Sistema Integrado de Monitorização e Alerta.</p>
                    <p>Proteção e Defesa do Cidadão de Rodeio - SC.</p>
                </section>

                <section className="footer-section">
                    <h3 className="footer-title">Emergência</h3>
                    <ul className="footer-links">
                        <li><span className="phone-number">199</span> - Defesa Civil</li>
                        <li><span className="phone-number">193</span> - Bombeiros</li>
                        <li><span className="phone-number">190</span> - Polícia Militar</li>
                    </ul>
                </section>

                <section className="footer-section">
                    <h3 className="footer-title">Links Úteis</h3>
                    <nav aria-label="Links do rodapé">
                        <ul className="footer-links">
                            <li><a href="#">Portal da Prefeitura</a></li>
                            <li><a href="#">Rotas de Fuga e Abrigos</a></li>
                            <li><a href="#">Plano de Contingência</a></li>
                        </ul>
                    </nav>
                </section>
            </div>

            <div className="footer-bottom">
                <p>&copy; {currentYear} Defesa Civil. Todos os direitos reservados.</p>
            </div>
        </footer>
    );
}