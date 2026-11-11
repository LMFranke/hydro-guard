import type { LoginResponseDTO } from '../types';
import { httpClient } from './httpClient';

export async function loginCoordinator(
    email: string,
    password: string
): Promise<LoginResponseDTO> {
    return httpClient.post<LoginResponseDTO>('/auth/login', {
        email: email.trim(),
        password,
    });
}

export async function changeCoordinatorPassword(
    token: string,
    currentPassword: string,
    newPassword: string
): Promise<void> {
    return httpClient.patch<void>(
        '/auth/change-password',
        { currentPassword, newPassword },
        { token, requiresAuth: true }
    );
}