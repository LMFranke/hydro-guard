import { Loader2, Waves } from 'lucide-react';
import {
    RainAccumulation,
    RiverCard,
    RiverChart,
} from '../components/modules';
import { useMonitoring, useTenant } from '../contexts';
import './Pages.css';

export function DashboardPage() {
    const { cityDisplayName } = useTenant();
    const { rivers, historyData, rainData, isLoadingTelemetry } = useMonitoring();

    if (isLoadingTelemetry) {
        return (
            <div className="hg-page-status-box" role="status" aria-live="polite">
                <Loader2 size={36} className="hg-spinner-icon" />
                <h3>Sincronizando Telemetria</h3>
                <p>
                    Carregando medições hidrometeorológicas em tempo real da Agência
                    Nacional de Águas (ANA) para {cityDisplayName}...
                </p>
            </div>
        );
    }

    return (
        <>
            <section aria-labelledby="section-rios">
                <div className="hg-dashboard-section-header">
                    <h2 id="section-rios" className="hg-section-title">
                        Nível dos Rios em Tempo Real
                    </h2>
                </div>

                {rivers.length === 0 ? (
                    <div className="hg-page-status-box">
                        <Waves size={36} className="hg-brand-icon" />
                        <h3>Nenhuma Estação Fluviométrica Ativa</h3>
                        <p>
                            Não foram encontradas leituras recentes de nível de rio para{' '}
                            {cityDisplayName} no momento.
                        </p>
                    </div>
                ) : (
                    <div className="hg-cards-grid">
                        {rivers.map((river) => (
                            <RiverCard key={river.id} data={river} />
                        ))}
                    </div>
                )}
            </section>

            <RiverChart data={historyData} />

            {rainData && <RainAccumulation data={rainData} />}
        </>
    );
}