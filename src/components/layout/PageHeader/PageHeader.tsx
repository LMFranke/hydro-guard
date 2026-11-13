import defaultBannerFallback from '../../../assets/banner-rodeio.png';
import { useMonitoring, useTenant } from '../../../contexts';
import { Badge, type BadgeVariant } from '../../ui';
import './PageHeader.css';

export function PageHeader() {
    const { cityDisplayName, bannerUrl } = useTenant();
    const { globalStatus } = useMonitoring();

    const solidVariant: BadgeVariant = `solid-${globalStatus.badgeVariant}`;

    return (
        <header
            className="hg-page-header"
            style={{
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.9)), url("${bannerUrl}"), url("${defaultBannerFallback}")`,
            }}
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