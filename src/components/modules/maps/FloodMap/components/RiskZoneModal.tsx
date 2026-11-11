import { useState, type FormEvent } from 'react';
import type {
    MapLayer,
    RiskLevel,
    RiskZone,
    RiskZoneInput,
} from '../../../../../types';
import { Button, Modal } from '../../../../ui';

interface RiskZoneModalProps {
    isOpen: boolean;
    editingZone: RiskZone | null;
    defaultCoordinates: [number, number];
    defaultLayer: MapLayer;
    onClose: () => void;
    onSubmitZone: (payload: RiskZoneInput, editingId: string | null) => Promise<void>;
}

interface RiskZoneFormProps {
    editingZone: RiskZone | null;
    defaultCoordinates: [number, number];
    defaultLayer: MapLayer;
    onSubmitZone: (payload: RiskZoneInput, editingId: string | null) => Promise<void>;
}

function RiskZoneForm({
                          editingZone,
                          defaultCoordinates,
                          defaultLayer,
                          onSubmitZone,
                      }: RiskZoneFormProps) {
    const [name, setName] = useState(editingZone?.name ?? '');
    const [zoneType, setZoneType] = useState<MapLayer>(
        editingZone?.zoneType ?? defaultLayer
    );
    const [level, setLevel] = useState<RiskLevel>(editingZone?.level ?? 'MEDIUM');
    const [latitude, setLatitude] = useState<string>(
        String(editingZone?.coordinates[0] ?? defaultCoordinates[0])
    );
    const [longitude, setLongitude] = useState<string>(
        String(editingZone?.coordinates[1] ?? defaultCoordinates[1])
    );
    const [radius, setRadius] = useState<string>(
        String(editingZone?.radius ?? 100)
    );
    const [description, setDescription] = useState(
        editingZone?.description ?? ''
    );
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSaving(true);

        try {
            await onSubmitZone(
                {
                    name,
                    zoneType,
                    level,
                    coordinates: [parseFloat(latitude), parseFloat(longitude)],
                    radius: parseInt(radius, 10),
                    description,
                },
                editingZone?.id ?? null
            );
        } catch {
            setFormError(
                'Erro ao salvar área de risco. Verifique os dados informados e a sua sessão.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="hg-form">
            {formError && <div className="hg-alert-banner error">{formError}</div>}

            <div className="hg-form-group">
                <label htmlFor="zone-name">Nome / Localidade</label>
                <input
                    id="zone-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Morro do Ipiranga / Rua XV"
                    required
                />
            </div>

            <div className="hg-form-row-2">
                <div className="hg-form-group">
                    <label htmlFor="zone-type">Tipo de Ocorrência</label>
                    <select
                        id="zone-type"
                        value={zoneType}
                        onChange={(e) => setZoneType(e.target.value as MapLayer)}
                    >
                        <option value="FLOOD">Inundação / Alagamento</option>
                        <option value="LANDSLIDE">Desabamento / Encosta</option>
                    </select>
                </div>

                <div className="hg-form-group">
                    <label htmlFor="zone-level">Grau de Risco</label>
                    <select
                        id="zone-level"
                        value={level}
                        onChange={(e) => setLevel(e.target.value as RiskLevel)}
                    >
                        <option value="LOW">Baixo</option>
                        <option value="MEDIUM">Médio</option>
                        <option value="HIGH">Alto</option>
                    </select>
                </div>
            </div>

            <div className="hg-form-row-coords">
                <div className="hg-form-group">
                    <label htmlFor="zone-lat">Latitude</label>
                    <input
                        id="zone-lat"
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        required
                    />
                </div>

                <div className="hg-form-group">
                    <label htmlFor="zone-lng">Longitude</label>
                    <input
                        id="zone-lng"
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        required
                    />
                </div>

                <div className="hg-form-group">
                    <label htmlFor="zone-radius">Raio (m)</label>
                    <input
                        id="zone-radius"
                        type="number"
                        min="10"
                        max="5000"
                        value={radius}
                        onChange={(e) => setRadius(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="hg-form-group">
                <label htmlFor="zone-desc">Descrição Técnica</label>
                <textarea
                    id="zone-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descreva o histórico ou vulnerabilidade do local..."
                    required
                />
            </div>

            <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSaving}
            >
                {isSaving
                    ? 'Salvando...'
                    : editingZone
                        ? 'Salvar Alterações'
                        : 'Cadastrar Área'}
            </Button>
        </form>
    );
}

export function RiskZoneModal({
                                  isOpen,
                                  editingZone,
                                  defaultCoordinates,
                                  defaultLayer,
                                  onClose,
                                  onSubmitZone,
                              }: RiskZoneModalProps) {
    const formResetKey = `${editingZone?.id ?? 'new'}-${defaultCoordinates[0]}-${defaultCoordinates[1]}-${defaultLayer}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingZone ? 'Editar Área de Risco' : 'Adicionar Área de Risco'}
        >
            <RiskZoneForm
                key={formResetKey}
                editingZone={editingZone}
                defaultCoordinates={defaultCoordinates}
                defaultLayer={defaultLayer}
                onSubmitZone={onSubmitZone}
            />
        </Modal>
    );
}