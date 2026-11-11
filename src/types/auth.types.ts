export interface LoginRequestDTO {
    email: string;
    password: string;
}

export interface LoginResponseDTO {
    token: string;
    name: string;
    email: string;
    citySlug: string;
}

export interface ChangePasswordRequestDTO {
    currentPassword: string;
    newPassword: string;
}