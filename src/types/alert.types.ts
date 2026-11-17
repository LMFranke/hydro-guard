export type OfficialAlertSeverity = 'CRITICAL' | 'WARNING' | 'WATCH';

export type AlertLifecycleStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED';

export interface BackendAlertDTO {
    id: string;
    title: string;
    severity: OfficialAlertSeverity;
    region: string;
    description: string;
    safetyGuidelines: string;
    source?: string;
    active: boolean;
    createdAt: string;
    updatedAt?: string;
    expiresAt?: string | null;
    closedAt?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    lifecycleStatus?: AlertLifecycleStatus;
}

export interface AlertData {
    id: string;
    title: string;
    severity: OfficialAlertSeverity;
    region: string;
    description: string;
    instructions: string[];
    source: string;
    issuedAt: string;
    updatedAt: string;
    expiresAt: string | null;
    closedAt: string | null;
    lifecycleStatus: AlertLifecycleStatus;
    coordinates: [number, number] | null;
}

export interface CreateAlertInput {
    title: string;
    severity: OfficialAlertSeverity;
    region: string;
    description: string;
    instructions: string[];
    source?: string;
    validityHours?: number;
    coordinates?: [number, number] | null;
}