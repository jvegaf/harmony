/**
 * Cliente HTTP para la API de Beatport
 *
 * Proporciona funcionalidades para:
 * - Obtener tokens OAuth anónimos desde HTML
 * - Buscar tracks mediante scraping de HTML
 * - Obtener detalles de tracks desde API v4
 * - Descargar artwork
 * - Algoritmo de matching para encontrar candidatos
 */

import * as cheerio from 'cheerio';
import { BeatportError } from '../error';
import { RateLimitState } from './concurrent';
import {
  BeatportOAuth,
  BeatportOAuthUtils,
  BeatportSearchResult,
  BeatportTrack,
  BeatportCandidate,
  BeatportTrackUtils,
  BeatportCandidateUtils,
} from '../../../../../preload/types/beatport';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Cliente HTTP para interactuar con Beatport
 */
export class BeatportClient {
  private httpClient: typeof fetch;
  private oauth: BeatportOAuth | null = null;
  private rateLimitState: RateLimitState;

  constructor(httpClient: typeof fetch = fetch) {
    this.httpClient = httpClient;
    this.rateLimitState = new RateLimitState();
  }

  /**
   * Crea una nueva instancia del cliente
   */
  static new(): BeatportClient {
    return new BeatportClient();
  }

  /**
   * Obtiene un token OAuth válido
   */
  async getToken(): Promise<string> {
    // Verificar si tenemos token válido en cache
    if (this.oauth && !BeatportOAuthUtils.isExpired(this.oauth)) {
      return this.oauth.access_token;
    }

    // Token expirado o no existe - obtener nuevo desde HTML
    const token = await this.fetchTokenFromHtml();
    return token;
  }

  /**
   * Busca tracks en Beatport
   */
  async search(title: string, artist: string): Promise<BeatportSearchResult> {
    try {
      const token = await this.getToken();
      const results = await this.searchWithToken(title, artist, token);
      return results;
    } catch (error) {
      if (error instanceof BeatportError) {
        throw error;
      }
      throw BeatportError.networkError(`Search failed: ${error}`);
    }
  }

  /**
   * Obtiene los detalles completos de un track desde la API v4
   */
  async getTrack(trackId: number): Promise<BeatportTrack> {
    try {
      const token = await this.getToken();
      const track = await this.getTrackWithToken(trackId, token);
      return track;
    } catch (error) {
      if (error instanceof BeatportError) {
        throw error;
      }
      throw BeatportError.networkError(`Failed to get track ${trackId}: ${error}`);
    }
  }

  /**
   * Obtiene un token OAuth desde el HTML de Beatport
   */
  private async fetchTokenFromHtml(): Promise<string> {
    const response = await this.httpClient('https://www.beatport.com/search/tracks?q=test', {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw BeatportError.networkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const token = this.extractTokenFromHtml(html);

    // Cachear el token
    this.oauth = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hora por defecto
      obtained_at: new Date(),
    };

    return token;
  }

  /**
   * Encuentra el mejor match para un track local (matching automático)
   */
  async findBestMatch(title: string, artist: string, durationSecs?: number): Promise<BeatportTrack> {
    const candidates = await this.searchCandidates(title, artist, durationSecs, 10, 0.1);

    if (candidates.length === 0) {
      throw BeatportError.trackNotFound(title, artist);
    }

    // El primer candidato es el mejor match
    const bestCandidate = candidates[0];
    const trackId = bestCandidate.beatport_id;

    // Obtener datos completos desde API v4
    return await this.getTrack(trackId);
  }

  /**
   * Busca candidatos para un track local (máximo N resultados con score mínimo)
   */
  async searchCandidates(
    title: string,
    artist: string,
    durationSecs: number | undefined,
    maxResults: number,
    minScore: number,
  ): Promise<BeatportCandidate[]> {
    const results: BeatportSearchResult = await this.search(title, artist);

    if (results.tracks.length === 0) {
      return [];
    }

    // Calcular scores y filtrar candidatos
    const candidates = this.calculateCandidateScores(title, artist, durationSecs, results.tracks, minScore);

    // Ordenar por score descendente y tomar los mejores
    candidates.sort((a, b) => b.similarity_score - a.similarity_score);

    return candidates.slice(0, maxResults);
  }

  /**
   * Descarga una imagen (artwork) desde una URL
   */
  async downloadArtwork(url: string): Promise<Uint8Array> {
    try {
      const response = await this.httpClient(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
        },
      });

      if (!response.ok) {
        throw BeatportError.networkError(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      if (error instanceof BeatportError) {
        throw error;
      }
      throw BeatportError.networkError(`Failed to download artwork: ${error}`);
    }
  }

  /**
   * Obtiene el estado de rate limiting
   */
  getRateLimitState(): RateLimitState {
    return this.rateLimitState;
  }

  /**
   * Extrae el token OAuth desde el script __NEXT_DATA__ del HTML
   */
  private extractTokenFromHtml(html: string): string {
    const $ = cheerio.load(html);
    const nextDataScript = $('#__NEXT_DATA__').html();

    if (!nextDataScript) {
      throw BeatportError.authError('No __NEXT_DATA__ script found in HTML');
    }

    try {
      const jsonData = JSON.parse(nextDataScript);

      // Navegar estructura: props.pageProps.anonSession.access_token
      const anonSession = jsonData?.props?.pageProps?.anonSession;
      if (!anonSession || typeof anonSession !== 'object') {
        throw BeatportError.authError('anonSession not found in __NEXT_DATA__');
      }

      const accessToken = (anonSession as any).access_token;
      if (!accessToken || typeof accessToken !== 'string') {
        throw BeatportError.authError('access_token not found in __NEXT_DATA__');
      }

      // Extraer expires_in si está disponible
      const expiresIn = (anonSession as any).expires_in || 3600;

      // Actualizar expires_in si tenemos el token cacheado
      if (this.oauth) {
        this.oauth.expires_in = expiresIn;
      }

      return accessToken;
    } catch (error) {
      // Re-lanzar BeatportError tal cual, convertir otros errores a ParseError
      if (error instanceof BeatportError) {
        throw error;
      }
      throw BeatportError.parseError(`Error parsing __NEXT_DATA__: ${error}`);
    }
  }

  /**
   * Busca tracks usando un token OAuth válido
   */
  private async searchWithToken(title: string, artist: string, token: string): Promise<BeatportSearchResult> {
    // Construir query: "artist title"
    const query = `${artist} ${title}`.trim();
    const encodedQuery = encodeURIComponent(query);

    const url = `https://www.beatport.com/search/tracks?q=${encodedQuery}`;

    const response = await this.httpClient(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Authorization: `Bearer ${token}`,
      },
    });

    // Manejar rate limiting
    if (response.status === 429) {
      throw BeatportError.rateLimited(60); // Reintentar en 60 segundos
    }

    if (!response.ok) {
      throw BeatportError.networkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const results = this.parseSearchResults(html);

    return results;
  }

  /**
   * Parsea los resultados de búsqueda desde __NEXT_DATA__
   */
  private parseSearchResults(html: string): BeatportSearchResult {
    const $ = cheerio.load(html);
    const nextDataScript = $('#__NEXT_DATA__').html();

    if (!nextDataScript) {
      throw BeatportError.parseError('No __NEXT_DATA__ script found in search HTML');
    }

    try {
      const jsonData = JSON.parse(nextDataScript);

      // Navegar estructura de Next.js:
      // props.pageProps.dehydratedState.queries[0].state.data.data
      const data = jsonData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.data;

      if (!data) {
        return {
          tracks: [],
          total_count: 0,
          page: 1,
          per_page: 25,
        };
      }

      // Deserializar array de tracks
      let tracks: any[] = [];
      if (Array.isArray(data)) {
        tracks = data;
      } else if (typeof data === 'object' && data !== null) {
        // A veces viene como objeto con tracks en una propiedad
        tracks = data.tracks || data.results || [];
      }

      // Convertir a BeatportTrack (manejar errores de parsing individual)
      const parsedTracks = tracks
        .map(track => {
          try {
            // Convertir del formato de scraping al formato BeatportTrack
            return {
              track_id: track.track_id,
              id: track.track_id,
              track_name: track.track_name,
              name: track.track_name,
              slug: track.slug,
              mix_name: track.mix_name,
              bpm: track.bpm,
              key: track.key_id
                ? {
                    id: track.key_id,
                    name: track.key_name,
                    camelot_number: undefined, // No disponible en scraping
                    camelot_letter: undefined,
                  }
                : undefined,
              key_name: track.key_name,
              artists:
                track.artists?.map((artist: any) => ({
                  artist_id: artist.artist_id,
                  id: artist.artist_id,
                  artist_name: artist.artist_name,
                  name: artist.artist_name,
                  slug: artist.slug,
                })) || [],
              remixers:
                track.remixers?.map((artist: any) => ({
                  artist_id: artist.artist_id,
                  id: artist.artist_id,
                  artist_name: artist.artist_name,
                  name: artist.artist_name,
                  slug: artist.slug,
                })) || [],
              genre: track.genre?.[0]
                ? {
                    genre_id: track.genre[0].genre_id,
                    id: track.genre[0].genre_id,
                    genre_name: track.genre[0].genre_name,
                    name: track.genre[0].genre_name,
                    slug: track.genre[0].slug,
                  }
                : undefined,
              sub_genre: track.sub_genre?.[0]
                ? {
                    genre_id: track.sub_genre[0].genre_id,
                    id: track.sub_genre[0].genre_id,
                    genre_name: track.sub_genre[0].genre_name,
                    name: track.sub_genre[0].genre_name,
                    slug: track.sub_genre[0].slug,
                  }
                : undefined,
              label: track.label
                ? {
                    label_id: track.label.label_id,
                    id: track.label.label_id,
                    label_name: track.label.label_name,
                    name: track.label.label_name,
                    slug: track.label.slug,
                  }
                : undefined,
              release: track.release
                ? {
                    release_id: track.release.release_id,
                    id: track.release.release_id,
                    release_name: track.release.release_name,
                    name: track.release.release_name,
                    slug: track.release.slug,
                    image: track.release.release_image_uri
                      ? {
                          id: 0, // No disponible
                          uri: track.release.release_image_uri,
                          dynamic_uri: track.release.release_image_dynamic_uri,
                        }
                      : undefined,
                    release_image_uri: track.release.release_image_uri,
                    image_uri: track.release.release_image_uri,
                    release_image_dynamic_uri: track.release.release_image_dynamic_uri,
                    image_dynamic_uri: track.release.release_image_dynamic_uri,
                  }
                : undefined,
              publish_date: track.publish_date,
              catalog_number: track.catalog_number,
              isrc: track.isrc,
              length_ms: track.length,
              length: track.length,
              image: track.track_image_uri
                ? {
                    id: 0, // No disponible
                    uri: track.track_image_uri,
                    dynamic_uri: track.track_image_dynamic_uri,
                  }
                : undefined,
              track_image_uri: track.track_image_uri,
              track_image_dynamic_uri: track.track_image_dynamic_uri,
            };
          } catch (error) {
            console.warn(`Error parsing track ${track?.track_id}: ${error}`);
            return null;
          }
        })
        .filter(track => track !== null);

      return {
        tracks: parsedTracks,
        total_count: parsedTracks.length,
        page: 1,
        per_page: 25,
      };
    } catch (error) {
      throw BeatportError.parseError(`Error parsing search __NEXT_DATA__: ${error}`);
    }
  }

  /**
   * Obtiene detalles completos de un track usando la API v4
   */
  private async getTrackWithToken(trackId: number, token: string): Promise<BeatportTrack> {
    const url = `https://api.beatport.com/v4/catalog/tracks/${trackId}/`;

    const response = await this.httpClient(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    // Manejar rate limiting
    if (response.status === 429) {
      throw BeatportError.rateLimited(60);
    }

    if (response.status === 404) {
      throw BeatportError.trackNotFound('Unknown', 'Unknown');
    }

    if (!response.ok) {
      throw BeatportError.networkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const track = this.parseApiTrack(data);

    return track;
  }

  /**
   * Parsea un track desde la respuesta de la API v4
   */
  private parseApiTrack(data: any): BeatportTrack {
    try {
      // Aquí iría la conversión completa de la respuesta de la API v4
      // a un objeto BeatportTrack
      // Por ahora, devolver el objeto raw con algunas conversiones básicas
      return {
        track_id: data.id,
        id: data.id,
        track_name: data.name,
        name: data.name,
        slug: data.slug,
        mix_name: data.mix_name,
        bpm: data.bpm,
        key: data.key
          ? {
              id: data.key.id,
              name: data.key.name,
              camelot_number: data.key.camelot_number,
              camelot_letter: data.key.camelot_letter,
            }
          : undefined,
        key_name: data.key?.name,
        artists:
          data.artists?.map((artist: any) => ({
            artist_id: artist.id,
            id: artist.id,
            artist_name: artist.name,
            name: artist.name,
            slug: artist.slug,
          })) || [],
        remixers:
          data.remixers?.map((artist: any) => ({
            artist_id: artist.id,
            id: artist.id,
            artist_name: artist.name,
            name: artist.name,
            slug: artist.slug,
          })) || [],
        genre: data.genres?.[0]
          ? {
              genre_id: data.genres[0].id,
              id: data.genres[0].id,
              genre_name: data.genres[0].name,
              name: data.genres[0].name,
              slug: data.genres[0].slug,
            }
          : undefined,
        sub_genre: data.sub_genres?.[0]
          ? {
              genre_id: data.sub_genres[0].id,
              id: data.sub_genres[0].id,
              genre_name: data.sub_genres[0].name,
              name: data.sub_genres[0].name,
              slug: data.sub_genres[0].slug,
            }
          : undefined,
        label: data.label
          ? {
              label_id: data.label.id,
              id: data.label.id,
              label_name: data.label.name,
              name: data.label.name,
              slug: data.label.slug,
            }
          : undefined,
        release: data.release
          ? {
              release_id: data.release.id,
              id: data.release.id,
              release_name: data.release.name,
              name: data.release.name,
              slug: data.release.slug,
              image: data.release.image
                ? {
                    id: data.release.image.id,
                    uri: data.release.image.url,
                    dynamic_uri: data.release.image.url,
                  }
                : undefined,
              label: data.release.label
                ? {
                    label_id: data.release.label.id,
                    id: data.release.label.id,
                    label_name: data.release.label.name,
                    name: data.release.label.name,
                    slug: data.release.label.slug,
                  }
                : undefined,
              release_image_uri: data.release.image?.url,
              image_uri: data.release.image?.url,
              release_image_dynamic_uri: data.release.image?.url,
              image_dynamic_uri: data.release.image?.url,
            }
          : undefined,
        publish_date: data.publish_date,
        catalog_number: data.catalog_number,
        isrc: data.isrc,
        length_ms: data.length_ms,
        length: data.length,
        image: data.image
          ? {
              id: data.image.id,
              uri: data.image.url,
              dynamic_uri: data.image.url,
            }
          : undefined,
        track_image_uri: data.image?.url,
        track_image_dynamic_uri: data.image?.url,
      };
    } catch (error) {
      throw BeatportError.parseError(`Error parsing API track response: ${error}`);
    }
  }

  /**
   * Calcula scores de similitud para tracks candidatos
   */
  private calculateCandidateScores(
    title: string,
    artist: string,
    durationSecs: number | undefined,
    tracks: BeatportTrack[],
    minScore: number,
  ): BeatportCandidate[] {
    // Normalizar strings para comparación
    const titleNorm = this.normalizeString(title);
    const artistNorm = this.normalizeString(artist);

    return tracks
      .map(track => {
        const trackTitle = this.normalizeString(track.name);
        const trackArtist = track.artists?.map(a => this.normalizeString(a.name)).join(' ') || '';

        // Score basado en similitud de título y artista
        const titleScore = this.calculateSimilarity(titleNorm, trackTitle);
        const artistScore = this.calculateSimilarity(artistNorm, trackArtist);

        // Score de duración (si está disponible)
        const durationScore = this.calculateDurationScore(durationSecs, BeatportTrackUtils.getDurationSecs(track));

        // Ponderación: 50% título, 30% artista, 20% duración
        const totalScore = titleScore * 0.5 + artistScore * 0.3 + durationScore * 0.2;

        return BeatportCandidateUtils.fromTrack(track, totalScore);
      })
      .filter(candidate => candidate.similarity_score >= minScore);
  }

  /**
   * Normaliza un string para comparación (lowercase + alphanumeric + whitespace)
   */
  private normalizeString(s: string): string {
    if (!s || typeof s !== 'string') {
      return '';
    }
    return s
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Solo alfanumérico y espacios
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Calcula la similitud entre dos strings usando distancia de Levenshtein (0.0 - 1.0)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) {
      return 1.0;
    }
    if (a.length === 0 || b.length === 0) {
      return 0.0;
    }

    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // inserción
          matrix[j - 1][i] + 1, // eliminación
          matrix[j - 1][i - 1] + cost, // sustitución
        );
      }
    }

    const distance = matrix[b.length][a.length];
    const maxLength = Math.max(a.length, b.length);
    return 1.0 - distance / maxLength;
  }

  /**
   * Calcula el score de duración entre dos tracks
   */
  private calculateDurationScore(localDuration: number | undefined, remoteDuration: number | undefined): number {
    if (!localDuration || !remoteDuration) {
      return 0.7; // Score neutral si no hay duración para comparar
    }

    const diff = Math.abs(localDuration - remoteDuration);

    if (diff <= 5) {
      return 1.0; // Match casi perfecto
    } else if (diff <= 15) {
      return 0.8; // Diferencia aceptable (fade in/out diferentes)
    } else if (diff <= 30) {
      return 0.5; // Podría ser edit o versión diferente
    } else {
      return 0.2; // Probablemente versión muy diferente
    }
  }
}

/**
 * Instancia por defecto del cliente
 */
export const defaultClient = BeatportClient.new();
