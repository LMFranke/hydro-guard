import './RiverCard.css';

export type RiverStatus = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'BELOW';

export interface RiverData {
    id: string;
    name: string;
    capacityPercentage: number;
    currentLevel: number;
    status: RiverStatus;
    location: string;
    lastRead: string;
}

interface RiverCardProps {
    data: RiverData;
}

export function RiverCard({ data }: RiverCardProps) {
    const statusClass = data.status.toLowerCase();
    const formattedDate = new Date(data.lastRead).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const statusLabels: Record<RiverStatus, string> = {
        CRITICAL: 'CRÍTICO',
        WARNING: 'ATENÇÃO',
        NORMAL: 'NORMAL',
        BELOW: 'ABAIXO'
    };

    return (
        <article className={`river-card border-${statusClass}`}>
            <header className="card-header">
                <div>
                    <h3 className="river-name">{data.name}</h3>
                    <p className="river-location">{data.location}</p>
                </div>
                <span className={`status-badge bg-${statusClass}`}>
          {statusLabels[data.status]}
        </span>
            </header>

            <div className="card-body">
                <div className="measurement">
                    <span className="label">Nível Atual</span>
                    <data className={`value text-${statusClass}`} value={data.currentLevel}>
                        {data.currentLevel.toFixed(2)}m
                    </data>
                </div>

                <div className="measurement">
                    <span className="label">Capacidade</span>
                    <data className="value" value={data.capacityPercentage}>
                        {data.capacityPercentage.toLocaleString('pt-BR')}%
                    </data>
                </div>
            </div>

            <footer className="card-footer">
                <span>Última leitura:</span>
                <time dateTime={data.lastRead}>{formattedDate}</time>
            </footer>
        </article>
    );
}