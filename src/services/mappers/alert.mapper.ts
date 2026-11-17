import type {
    AlertData,
    AlertLifecycleStatus,
    BackendAlertDTO,
    CreateAlertInput,
} from '../../types';
import { formatAlertIssuedAt } from '../../utils';

const DEFAULT_INSTRUCTION = 'Siga as orientações oficiais da Defesa Civil.';

function resolveLifecycleStatus(dto: BackendAlertDTO): AlertLifecycleStatus {
    if (dto.lifecycleStatus) {
        return dto.lifecycleStatus;
    }
    if (!dto.active || dto.closedAt) {
        return 'CLOSED';
    }
    if (dto.expiresAt && new Date(dto.expiresAt).getTime() < Date.now()) {
        return 'EXPIRED';
    }
    return 'ACTIVE';
}

export function mapBackendAlertToUi(dto: BackendAlertDTO): AlertData {
    const parsedInstructions = dto.safetyGuidelines
        ? dto.safetyGuidelines
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

    const hasValidCoords =
        typeof dto.latitude === 'number' &&
        typeof dto.longitude === 'number' &&
        !Number.isNaN(dto.latitude) &&
        !Number.isNaN(dto.longitude);

    return {
        id: dto.id,
        title: dto.title,
        severity: dto.severity,
        region: dto.region,
        description: dto.description,
        instructions:
            parsedInstructions.length > 0
                ? parsedInstructions
                : [DEFAULT_INSTRUCTION],
        source: dto.source?.trim() || 'Defesa Civil Municipal',
        issuedAt: formatAlertIssuedAt(dto.createdAt),
        updatedAt: formatAlertIssuedAt(dto.updatedAt ?? dto.createdAt),
        expiresAt: dto.expiresAt ? formatAlertIssuedAt(dto.expiresAt) : null,
        closedAt: dto.closedAt ? formatAlertIssuedAt(dto.closedAt) : null,
        lifecycleStatus: resolveLifecycleStatus(dto),
        coordinates: hasValidCoords ? [dto.latitude!, dto.longitude!] : null,
    };
}

export function mapCreateAlertInputToPayload(input: CreateAlertInput) {
    const cleanInstructions = input.instructions
        .map((line) => line.trim())
        .filter(Boolean);

    return {
        title: input.title.trim(),
        severity: input.severity,
        region: input.region.trim(),
        description: input.description.trim(),
        safetyGuidelines:
            cleanInstructions.length > 0
                ? cleanInstructions.join('\n')
                : DEFAULT_INSTRUCTION,
        source: input.source?.trim() || undefined,
        validityHours: input.validityHours ?? 12,
        latitude: input.coordinates ? input.coordinates[0] : undefined,
        longitude: input.coordinates ? input.coordinates[1] : undefined,
    };
}