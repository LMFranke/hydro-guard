import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CircleMarker,
    GeoJSON,
    MapContainer,
    TileLayer,
    Tooltip as LeafletTooltip,
} from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import {
    ArrowRight,
    Loader2,
    MapPin,
    Search,
    ShieldAlert,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { ENV } from '../../config/env';
import {
    fetchAllCities,
    fetchSantaCatarinaMunicipalMesh,
    normalizeLocationName,
    peekCachedScMesh,
    type IbgeGeoJsonCollection,
    type IbgeGeoJsonFeature,
} from '../../services';
import type { CityTenant } from '../../types';
import { CACHE_TTL, readCache, writeCache } from '../../utils';
import './StatePortalPage.css';

const SC_CENTER: [number, number] = [-27.25, -50.35];
const CITIES_CACHE_KEY = 'portal_cities_list';

export function StatePortalPage() {
    const navigate = useNavigate();

    const [cities, setCities] = useState<CityTenant[]>(
        () => readCache<CityTenant[]>(CITIES_CACHE_KEY)?.data ?? []
    );
    const [scMesh, setScMesh] = useState<IbgeGeoJsonCollection | null>(
        () => peekCachedScMesh()
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState<boolean>(
        () => readCache<CityTenant[]>(CITIES_CACHE_KEY) === null
    );

    useEffect(() => {
        document.title = 'HydroGuard | Portal Estadual de Defesa Civil - SC';
        let isMounted = true;

        async function loadPortalData() {
            const cachedCities = readCache<CityTenant[]>(CITIES_CACHE_KEY);
            const shouldFetchCities = !cachedCities || cachedCities.isExpired;

            const citiesPromise = shouldFetchCities
                ? fetchAllCities()
                : Promise.resolve(cachedCities.data);

            const [citiesResult, meshResult] = await Promise.allSettled([
                citiesPromise,
                fetchSantaCatarinaMunicipalMesh(),
            ]);

            if (!isMounted) return;

            if (citiesResult.status === 'fulfilled') {
                setCities(citiesResult.value);
                if (shouldFetchCities) {
                    writeCache(
                        CITIES_CACHE_KEY,
                        citiesResult.value,
                        CACHE_TTL.CITIES_LIST_MS
                    );
                }
            }

            if (meshResult.status === 'fulfilled') {
                setScMesh(meshResult.value);
            }

            setIsLoading(false);
        }

        void loadPortalData();

        return () => {
            isMounted = false;
        };
    }, []);

    const activeCityByNormalizedName = useMemo(() => {
        const map = new Map<string, CityTenant>();
        for (const city of cities) {
            map.set(normalizeLocationName(city.name), city);
        }
        return map;
    }, [cities]);

    const filteredCities = useMemo(() => {
        const q = normalizeLocationName(searchQuery);
        if (!q) return cities;
        return cities.filter((city) =>
            normalizeLocationName(city.name).includes(q)
        );
    }, [cities, searchQuery]);

    const getFeatureStyle = (feature?: IbgeGeoJsonFeature): PathOptions => {
        const normName = feature?.properties?.normalizedName ?? '';
        const matchedCity = activeCityByNormalizedName.get(normName);

        if (matchedCity) {
            const color = matchedCity.themeColor || '#3b82f6';
            return {
                color: '#ffffff',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.65,
            };
        }

        return {
            color: '#475569',
            weight: 0.8,
            fillColor: '#1e293b',
            fillOpacity: 0.35,
        };
    };

    const handleEachFeature = (feature: IbgeGeoJsonFeature, layer: Layer) => {
        const officialName = feature.properties.municipalityName ?? 'Município';
        const normName = feature.properties.normalizedName ?? '';
        const matchedCity = activeCityByNormalizedName.get(normName);

        if (matchedCity) {
            layer.bindTooltip(
                `📍 ${matchedCity.name} - ${matchedCity.state} • Monitoramento Ativo (Clique para acessar)`,
                { sticky: true, className: 'hg-sc-tooltip' }
            );

            layer.on({
                mouseover: (e) => {
                    const target = e.target;
                    target.setStyle({
                        weight: 3,
                        fillOpacity: 0.85,
                    });
                },
                mouseout: (e) => {
                    const target = e.target;
                    target.setStyle(getFeatureStyle(feature));
                },
                click: () => {
                    navigate(`/${matchedCity.slug}`);
                },
            });
        } else {
            layer.bindTooltip(`${officialName} (Não integrado)`, {
                sticky: true,
                className: 'hg-sc-tooltip',
            });

            layer.on({
                mouseover: (e) => {
                    const target = e.target;
                    target.setStyle({
                        fillColor: '#334155',
                        fillOpacity: 0.55,
                    });
                },
                mouseout: (e) => {
                    const target = e.target;
                    target.setStyle(getFeatureStyle(feature));
                },
            });
        }
    };

    return (
        <div className="hg-portal-page">
            <header className="hg-portal-header">
                <div className="hg-portal-brand">
                    <div className="hg-portal-brand-shield">
                        <ShieldAlert size={26} />
                    </div>
                    <div>
                        <h1>HYDROGUARD • SANTA CATARINA</h1>
                        <p>
                            Plataforma Estadual de Monitoramento Hidrometeorológico e Defesa
                            Civil
                        </p>
                    </div>
                </div>

                <div className="hg-portal-stats">
          <span className="hg-portal-stat-pill">
            <span className="hg-portal-stat-dot" />
              {cities.length} Município(s) com Defesa Civil Integrada
          </span>
                </div>
            </header>

            <main className="hg-portal-main">
                <section
                    className="hg-portal-map-card"
                    aria-label="Mapa de Divisões Municipais de Santa Catarina"
                >
                    <div className="hg-portal-map-overlay-info">
                        <h2>Malha Municipal de Santa Catarina (IBGE)</h2>
                        <p>
                            Clique em um município destacado no mapa para abrir o painel da
                            Defesa Civil local.
                        </p>
                    </div>

                    <MapContainer
                        center={SC_CENTER}
                        zoom={8}
                        scrollWheelZoom={true}
                        className="hg-portal-leaflet"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, FAO, NOAA, USGS'
                            url={ENV.ARCGIS_DARK_CANVAS_TILE_URL}
                        />

                        {scMesh && (
                            <GeoJSON
                                key={`sc-mesh-${cities.length}`}
                                data={scMesh as never}
                                style={(feature) =>
                                    getFeatureStyle(feature as IbgeGeoJsonFeature | undefined)
                                }
                                onEachFeature={(feature, layer) =>
                                    handleEachFeature(feature as IbgeGeoJsonFeature, layer)
                                }
                            />
                        )}

                        {cities.map((city) => (
                            <CircleMarker
                                key={city.id}
                                center={[city.mapLat, city.mapLng]}
                                radius={7}
                                pathOptions={{
                                    color: '#ffffff',
                                    weight: 2,
                                    fillColor: city.themeColor || '#3b82f6',
                                    fillOpacity: 1,
                                }}
                                eventHandlers={{
                                    click: () => navigate(`/${city.slug}`),
                                }}
                            >
                                <LeafletTooltip direction="top" className="hg-sc-tooltip">
                                    {city.name} - {city.state} (Acessar Painel)
                                </LeafletTooltip>
                            </CircleMarker>
                        ))}
                    </MapContainer>

                    <div className="hg-portal-map-legend">
                        <div className="hg-portal-legend-row">
                            <span className="hg-portal-swatch-active" />
                            <span>Defesa Civil Integrada (Clique para abrir)</span>
                        </div>
                        <div className="hg-portal-legend-row">
                            <span className="hg-portal-swatch-inactive" />
                            <span>Demais Municípios de SC (295 divisões)</span>
                        </div>
                    </div>
                </section>

                <aside className="hg-portal-sidebar">
                    <div className="hg-portal-sidebar-header">
                        <h2>Municípios Monitorados</h2>
                        <p>
                            Selecione uma cidade para visualizar telemetria da ANA, radar e
                            alertas.
                        </p>
                    </div>

                    <div className="hg-portal-search-box">
                        <Search size={16} className="hg-portal-search-icon" />
                        <input
                            type="text"
                            className="hg-portal-search-input"
                            placeholder="Buscar município cadastrado..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <div
                            style={{
                                padding: '2rem',
                                textAlign: 'center',
                                color: '#94a3b8',
                            }}
                        >
                            <Loader2 size={28} className="hg-spinner-icon" />
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                Carregando municípios do Supabase...
                            </p>
                        </div>
                    ) : (
                        <div className="hg-portal-cities-list">
                            {filteredCities.map((city) => (
                                <button
                                    key={city.id}
                                    type="button"
                                    className="hg-portal-city-card"
                                    style={{
                                        borderLeftColor: city.themeColor || '#3b82f6',
                                    }}
                                    onClick={() => navigate(`/${city.slug}`)}
                                >
                                    <div className="hg-portal-city-info">
                    <span className="hg-portal-city-name">
                      {city.name} - {city.state}
                    </span>
                                        <span className="hg-portal-city-meta">
                      <MapPin size={13} />
                      Rota: /{city.slug}
                    </span>
                                    </div>

                                    <span className="hg-portal-city-action">
                    Acessar <ArrowRight size={15} />
                  </span>
                                </button>
                            ))}
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
}