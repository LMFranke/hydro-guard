import { Edit2, Trash2 } from 'lucide-react';
import type { RiskLevel, RiskZone } from '../../../../../types';
import { RISK_LEVEL_LABELS } from '../../../../../utils';
import { Badge, Button, type BadgeVariant } from '../../../../ui';

interface RiskZonePopupProps {
    zone: RiskZone;
    isCoordinator: boolean;
    onEdit: (zone: RiskZone) => void;
    onDelete: (id: string) => void;
}

const RISK_BADGE_VARIANT: Record<RiskLevel, BadgeVariant> = {
    HIGH: 'critical',
    MEDIUM: 'warning',
    LOW: 'watch',
};

export function RiskZonePopup({
                                  zone,
                                  isCoordinator,
                                  onEdit,
                                  onDelete,
                              }: RiskZonePopupProps) {
    return (
        <div className="hg-map-popup">
            <strong>{zone.name}</strong>
            <div>
                <Badge variant={RISK_BADGE_VARIANT[zone.level]}>
                    Risco {RISK_LEVEL_LABELS[zone.level]}
                </Badge>
            </div>
            <p>{zone.description}</p>

            {isCoordinator && (
                <div className="hg-popup-actions">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit2 size={12} />}
                        onClick={() => onEdit(zone)}
                    >
                        Editar
                    </Button>
                    <Button
                        variant="danger-soft"
                        size="sm"
                        leftIcon={<Trash2 size={12} />}
                        onClick={() => onDelete(zone.id)}
                    >
                        Excluir
                    </Button>
                </div>
            )}
        </div>
    );
}