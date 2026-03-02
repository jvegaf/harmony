/**
 * Tipos relacionados con releases de Beatport
 *
 * Incluye: BeatportRelease, BeatportImage
 */

import { BeatportLabel } from './core';

/**
 * Imagen de Beatport (artwork)
 */
export interface BeatportImage {
  id: number;
  uri: string;
  dynamic_uri?: string;
}

/**
 * Utilidades para BeatportImage
 */
export class BeatportImageUtils {
  /**
   * Obtiene la URL de imagen con tamaño específico
   * Si hay dynamic_uri, reemplaza el placeholder con el tamaño
   */
  static getUrl(image: BeatportImage, size: number): string {
    if (image.dynamic_uri) {
      // El dynamic_uri tiene formato: "https://geo-media.beatport.com/image_size/{size}x{size}/..."
      return image.dynamic_uri.replace('{w}', size.toString()).replace('{h}', size.toString());
    } else {
      return image.uri;
    }
  }
}

/**
 * Release de Beatport
 */
export interface BeatportRelease {
  release_id?: number;
  id: number;
  release_name?: string;
  name: string;
  slug?: string;
  image?: BeatportImage;
  /** Label del release (API v4 tiene label dentro de release, no en track directamente) */
  label?: BeatportLabel;
  /** Imagen como string (scraping) */
  release_image_uri?: string;
  image_uri?: string;
  release_image_dynamic_uri?: string;
  image_dynamic_uri?: string;
}

/**
 * Utilidades para BeatportRelease
 */
export class BeatportReleaseUtils {
  /**
   * Obtiene la URL del artwork en tamaño especificado
   */
  static getArtworkUrl(release: BeatportRelease, size: number): string | undefined {
    // Primero intentar desde image (objeto)
    if (release.image) {
      return BeatportImageUtils.getUrl(release.image, size);
    }
    // Luego desde image_dynamic_uri (scraping)
    if (release.image_dynamic_uri) {
      return release.image_dynamic_uri.replace('{w}', size.toString()).replace('{h}', size.toString());
    }
    // Finalmente image_uri sin dynamic
    return release.image_uri || release.release_image_uri;
  }
}
