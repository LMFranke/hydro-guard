import type { AlertData, BackendAlertDTO, CreateAlertInput } from '../../types';
import { formatAlertIssuedAt } from '../../utils';

const DEFAULT_INSTRUCTION = 'Siga as orientações oficiais da Defesa Civil.';

export function mapBackendAlertToUi(dto: BackendAlertDTO): AlertData {
    const parsedInstructions = dto.safetyGuidelines
        ? dto.safetyGuidelines
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

    return {
        id: dto.id,
        title: dto.title,
        severity: dto.severity,
        region: dto.region,
        description: dto.description,
        instructions:
            parsedInstructions.length > 0 ? parsedInstructions : [DEFAULT_INSTRUCTION],
        issuedAt: formatAlertIssuedAt(dto.createdAt),
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
    };
}