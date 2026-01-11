/**
 * Tipos relacionados con tracks de Beatport
 *
 * Incluye: BeatportTrack, BeatportKey, BeatportSearchResult
 */

import { BeatportArtist, BeatportLabel, GenreData, GenreDataUtils } from './core';
import { BeatportImage, BeatportImageUtils, BeatportRelease, BeatportReleaseUtils } from './release';

/**
 * Key musical de Beatport
 */
export interface BeatportKey {
  id: number;
  name: string;
  camelot_number?: number;
  camelot_letter?: string;
}

/**
 * Utilidades para BeatportKey
 */
export class BeatportKeyUtils {
  /**
   * Obtiene la key en formato Camelot (ej: "8A", "11B")
   */
  static camelot(key: BeatportKey): string | undefined {
    if (key.camelot_number !== undefined && key.camelot_letter) {
      return `${key.camelot_number}${key.camelot_letter}`;
    }
    return undefined;
  }

  /**
   * Obtiene la key en formato Open Key
   */
  static openKey(key: BeatportKey): string {
    return key.name;
  }
}

/**
 * Track completo de Beatport (desde API v4 y scraping)
 */
export interface BeatportTrack {
  track_id?: number;
  id: number;
  track_name?: string;
  name: string;
  slug?: string;
  mix_name?: string;
  bpm?: number;
  /** Key como objeto (API v4) o null (scraping - usa key_name) */
  key?: BeatportKey;
  /** Key como string (scraping) */
  key_name?: string;
  artists?: BeatportArtist[];
  remixers?: BeatportArtist[];
  /** Genre puede ser objeto o array */
  genre?: GenreData;
  sub_genre?: GenreData;
  label?: BeatportLabel;
  release?: BeatportRelease;
  publish_date?: string;
  catalog_number?: string;
  isrc?: string;
  /** Duración en ms (desde length_ms) */
  length_ms?: number;
  /** Campo length (API v4 lo envía como string "MM:SS" o segundos como número) */
  length?: string | number;
  image?: BeatportImage;
  /** Imagen como string (scraping) */
  track_image_uri?: string;
  track_image_dynamic_uri?: string;
}

/**
 * Utilidades para BeatportTrack
 */
export class BeatportTrackUtils {
  /**
   * Obtiene el nombre de la key (de objeto o string)
   */
  static getKeyName(track: BeatportTrack): string | undefined {
    return track.key?.name || track.key_name;
  }

  /**
   * Obtiene la duración en segundos
   * Intenta primero `length_ms`, luego parsea `length` (puede ser ms, segundos o "MM:SS")
   */
  static getDurationSecs(track: BeatportTrack): number | undefined {
    // Primero intentar desde length_ms
    if (track.length_ms !== undefined) {
      return track.length_ms / 1000;
    }

    // Fallback: parsear length
    if (track.length !== undefined) {
      const lengthVal = track.length;

      // Si es número
      if (typeof lengthVal === 'number') {
        // Si es > 10000, probablemente son milisegundos
        if (lengthVal > 10000) {
          return lengthVal / 1000;
        }
        return lengthVal;
      }

      // Si es string "MM:SS"
      if (typeof lengthVal === 'string') {
        const parts = lengthVal.split(':');
        if (parts.length === 2) {
          const mins = parseInt(parts[0], 10);
          const secs = parseInt(parts[1], 10);
          if (!isNaN(mins) && !isNaN(secs)) {
            return mins * 60 + secs;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Obtiene el nombre del género principal
   */
  static getGenreName(track: BeatportTrack): string | undefined {
    const genre = GenreDataUtils.first(track.genre || null);
    return genre?.name;
  }

  /**
   * Obtiene el label del track
   * En API v4, el label está dentro de release
   * En scraping, puede estar directamente en track o en release
   */
  static getLabel(track: BeatportTrack): BeatportLabel | undefined {
    // Primero intentar label directo en track (scraping)
    if (track.label) {
      return track.label;
    }
    // Luego desde release.label (API v4)
    if (track.release?.label) {
      return track.release.label;
    }
    return undefined;
  }

  /**
   * Obtiene el nombre del label
   */
  static getLabelName(track: BeatportTrack): string | undefined {
    return BeatportTrackUtils.getLabel(track)?.name;
  }

  /**
   * Obtiene la URL del artwork en tamaño especificado
   */
  static getArtworkUrl(track: BeatportTrack, size: number): string | undefined {
    // Primero intentar desde release
    if (track.release) {
      const url = BeatportReleaseUtils.getArtworkUrl(track.release, size);
      if (url) return url;
    }
    // Luego desde image directamente
    if (track.image) {
      return BeatportImageUtils.getUrl(track.image, size);
    }
    // Finalmente desde track_image_dynamic_uri (scraping)
    if (track.track_image_dynamic_uri) {
      return track.track_image_dynamic_uri.replace('{w}', size.toString()).replace('{h}', size.toString());
    }
    // O track_image_uri sin dynamic
    return track.track_image_uri;
  }
}

/**
 * Resultado de búsqueda en Beatport
 */
export interface BeatportSearchResult {
  tracks: BeatportTrack[];
  total_count: number;
  page: number;
  per_page: number;
}
