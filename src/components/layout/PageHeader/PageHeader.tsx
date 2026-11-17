import { useMonitoring, useTenant } from '../../../contexts';
import { Badge, type BadgeVariant } from '../../ui';
import './PageHeader.css';

export function PageHeader() {
    const { cityDisplayName, bannerUrl } = useTenant();
    const { globalStatus } = useMonitoring();

    const solidVariant: BadgeVariant = `solid-${globalStatus.badgeVariant}`;

    const headerStyle = bannerUrl
        ? {
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.9)), url("${bannerUrl}")`,
        }
        : undefined;

    return (
        <header
            className={`hg-page-header ${!bannerUrl ? 'is-institutional-fallback' : ''}`}
            style={headerStyle}
        >
            <div className="hg-header-titles">
                <h1>Painel de Monitorização</h1>
                <p className="subtitle">{cityDisplayName}</p>
            </div>

            <div className="hg-global-status">
                <span>Status da Cidade:</span>
                <Badge variant={solidVariant}>{globalStatus.label}</Badge>
            </div>
        </header>
    );
}