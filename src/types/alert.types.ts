export type OfficialAlertSeverity = 'CRITICAL' | 'WARNING' | 'WATCH';

export interface BackendAlertDTO {
    id: string;
    title: string;
    severity: OfficialAlertSeverity;
    region: string;
    description: string;
    safetyGuidelines: string;
    active: boolean;
    createdAt: string;
}

export interface AlertData {
    id: string;
    title: string;
    severity: OfficialAlertSeverity;
    region: string;
    description: string;
    instructions: string[];
    issuedAt: string;
}

export interface CreateAlertInput {
    title: string;
    severity: OfficialAlertSeverity;
    region: string;
    description: string;
    instructions: string[];
}