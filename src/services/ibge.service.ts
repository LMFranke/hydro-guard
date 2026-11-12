export interface IbgeMunicipalityProperty {
    codarea: string;
    municipalityName?: string;
    normalizedName?: string;
}

export interface IbgeGeoJsonFeature {
    type: 'Feature';
    properties: IbgeMunicipalityProperty;
    geometry: {
        type: string;
        coordinates: unknown;
    };
}

export interface IbgeGeoJsonCollection {
    type: 'FeatureCollection';
    features: IbgeGeoJsonFeature[];
}

interface IbgeLocalityDTO {
    id: number;
    nome: string;
}

const SC_GEOJSON_URL =
    'https://servicodados.ibge.gov.br/api/v3/malhas/estados/42?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio';
const SC_LOCALITIES_URL =
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados/42/municipios';

const BROWSER_CACHE_NAME = 'hydroguard-ibge-static-v1';
const MESH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

let memoryScMesh: IbgeGeoJsonCollection | null = null;

export function normalizeLocationName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

export function peekCachedScMesh(): IbgeGeoJsonCollection | null {
    return memoryScMesh;
}

/**
 * Busca um JSON utilizando a Cache Storage API do navegador para persistência de longo prazo (7 dias).
 */
async function fetchWithBrowserCache<T>(url: string): Promise<T> {
    if ('caches' in window) {
        try {
            const cache = await window.caches.open(BROWSER_CACHE_NAME);
            const cachedResponse = await cache.match(url);

            if (cachedResponse) {
                const cachedAtHeader = cachedResponse.headers.get('x-hg-cached-at');
                const isFresh =
                    cachedAtHeader &&
                    Date.now() - Number(cachedAtHeader) < MESH_CACHE_TTL_MS;

                if (isFresh) {
                    return (await cachedResponse.json()) as T;
                }
            }

            const networkResponse = await fetch(url);
            if (networkResponse.ok) {
                const bodyText = await networkResponse.text();
                const headers = new Headers(networkResponse.headers);
                headers.set('x-hg-cached-at', String(Date.now()));

                await cache.put(
                    url,
                    new Response(bodyText, {
                        status: networkResponse.status,
                        statusText: networkResponse.statusText,
                        headers,
                    })
                );

                return JSON.parse(bodyText) as T;
            }
        } catch {
            // Fallback para fetch normal caso o CacheStorage esteja restrito
        }
    }

    const fallbackResponse = await fetch(url);
    if (!fallbackResponse.ok) {
        throw new Error(`Falha ao buscar recurso do IBGE: ${url}`);
    }
    return (await fallbackResponse.json()) as T;
}

export async function fetchSantaCatarinaMunicipalMesh(): Promise<IbgeGeoJsonCollection> {
    if (memoryScMesh) {
        return memoryScMesh;
    }

    const [meshData, localities] = await Promise.all([
        fetchWithBrowserCache<IbgeGeoJsonCollection>(SC_GEOJSON_URL),
        fetchWithBrowserCache<IbgeLocalityDTO[]>(SC_LOCALITIES_URL),
    ]);

    const codeToNameMap = new Map<string, string>();
    for (const loc of localities) {
        codeToNameMap.set(String(loc.id), loc.nome);
    }

    for (const feature of meshData.features) {
        const code = feature.properties.codarea;
        const officialName = codeToNameMap.get(code) ?? `Município #${code}`;
        feature.properties.municipalityName = officialName;
        feature.properties.normalizedName = normalizeLocationName(officialName);
    }

    memoryScMesh = meshData;
    return meshData;
}