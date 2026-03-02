/**
 * Tipos e interfaces para providers de tracks
 *
 *   Este módulo define la interface común que todos los providers
 * (Beatport, Traxsource) deben implementar para garantizar consistencia.
 */

import { ProviderSource } from '@preload/types/tagger';

/**
 * Datos crudos de un track desde un provider (antes de scoring)
 *
 * Este tipo representa la información que cada provider retorna de su API/scraper,
 * antes de calcular el score de similitud.
 */
export interface RawTrackData {
  /** ID del track en el provider */
  id: string;

  /** Título del track */
  title: string;

  /** Mix name (Original Mix, Extended Mix, etc.) */
  mix_name?: string;

  /** Lista de artistas */
  artists: string[];

  /** BPM detectado */
  bpm?: number;

  /** Key musical */
  key?: string;

  /** Duración en segundos */
  duration_secs?: number;

  /** URL del artwork */
  artwork_url?: string;

  /** Género */
  genre?: string;

  /** Label/Sello */
  label?: string;

  /** Fecha de publicación (YYYY-MM-DD o formato ISO) */
  release_date?: string;
}

/**
 * Interface que todos los providers deben implementar
 */
export interface TrackProvider {
  /** Nombre del provider */
  readonly name: ProviderSource;

  /**
   * Busca tracks en el provider
   * @param title Título del track a buscar
   * @param artist Artista del track a buscar
   * @returns Lista de tracks crudos (sin score de similitud)
   */
  search(title: string, artist: string): Promise<RawTrackData[]>;
}

/**
 * Configuración de un provider
 */
export interface ProviderConfig {
  /** Nombre del provider */
  name: ProviderSource;

  /** Máximo de resultados a retornar de este provider */
  maxResults?: number;

  /** Indica si el provider está habilitado */
  enabled?: boolean;
}
