import type { CityTenant } from '../types';
import { httpClient } from './httpClient';

export async function fetchAllCities(): Promise<CityTenant[]> {
    return httpClient.get<CityTenant[]>('/tenant');
}

export async function fetchCityTenant(slug: string): Promise<CityTenant> {
    return httpClient.get<CityTenant>(`/tenant/${encodeURIComponent(slug)}`);
}