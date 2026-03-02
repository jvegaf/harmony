/**
 * Tipos de datos core para integración con Beatport
 *
 * Incluye estructuras básicas: OAuth, Artist, Genre, Label
 */

/**
 * Token OAuth de Beatport
 */
export interface BeatportOAuth {
  access_token: string;
  token_type: string;
  expires_in: number;
  /** Timestamp cuando se obtuvo el token (no serializado) */
  obtained_at?: Date;
}

/**
 * Extensión con métodos para BeatportOAuth
 */
export class BeatportOAuthUtils {
  /**
   * Verifica si el token ha expirado (con margen de 60 segundos)
   */
  static isExpired(oauth: BeatportOAuth): boolean {
    if (!oauth.obtained_at) {
      return true; // Si no tenemos timestamp, asumimos expirado
    }

    const elapsed = (Date.now() - oauth.obtained_at.getTime()) / 1000;
    return elapsed >= oauth.expires_in - 60;
  }
}

/**
 * Artista de Beatport (simplificado)
 */
export interface BeatportArtist {
  artist_id?: number;
  id: number;
  artist_name?: string;
  name: string;
  slug?: string;
}

/**
 * Género de Beatport
 */
export interface BeatportGenre {
  genre_id?: number;
  id: number;
  genre_name?: string;
  name: string;
  slug?: string;
}

/**
 * Contenedor para genre (puede ser objeto, array, o null/vacío)
 */
export type GenreData = BeatportGenre | BeatportGenre[] | null;

/**
 * Utilidades para trabajar con GenreData
 */
export class GenreDataUtils {
  /**
   * Obtiene el primer género
   */
  static first(genre: GenreData): BeatportGenre | undefined {
    if (!genre) return undefined;
    if (Array.isArray(genre)) return genre[0];
    return genre;
  }
}

/**
 * Label de Beatport
 */
export interface BeatportLabel {
  label_id?: number;
  id: number;
  label_name?: string;
  name: string;
  slug?: string;
}
