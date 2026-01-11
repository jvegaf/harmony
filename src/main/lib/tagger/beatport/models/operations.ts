/**
 * Tipos relacionados con operaciones fix_tags de Beatport
 *
 * Incluye: FixTagsResult, BatchFixResult, FixTagsProgress, FixTagsPhase
 */

import { BeatportTags } from './tags';

/**
 * Resultado de fix_tags para un track individual
 */
export interface FixTagsResult {
  track_id: string;
  success: boolean;
  beatport_track_id?: number;
  tags_applied?: BeatportTags;
  error?: string;
}

/**
 * Utilidades para FixTagsResult
 */
export class FixTagsResultUtils {
  /**
   * Crea un resultado exitoso
   */
  static success(trackId: string, beatportId: number, tags: BeatportTags): FixTagsResult {
    return {
      track_id: trackId,
      success: true,
      beatport_track_id: beatportId,
      tags_applied: tags,
      error: undefined,
    };
  }

  /**
   * Crea un resultado de error
   */
  static error(trackId: string, error: string): FixTagsResult {
    return {
      track_id: trackId,
      success: false,
      beatport_track_id: undefined,
      tags_applied: undefined,
      error,
    };
  }
}

/**
 * Resultado de batch fix_tags
 */
export interface BatchFixResult {
  total: number;
  success_count: number;
  failed_count: number;
  results: FixTagsResult[];
}

/**
 * Utilidades para BatchFixResult
 */
export class BatchFixResultUtils {
  static new(results: FixTagsResult[]): BatchFixResult {
    const total = results.length;
    const success_count = results.filter(r => r.success).length;
    const failed_count = total - success_count;

    return {
      total,
      success_count,
      failed_count,
      results,
    };
  }
}

/**
 * Evento de progreso para UI
 */
export interface FixTagsProgress {
  current: number;
  total: number;
  current_track_title: string;
  phase: FixTagsPhase;
}

/**
 * Fases del proceso fix_tags
 */
export enum FixTagsPhase {
  Searching = 'searching',
  Downloading = 'downloading',
  ApplyingTags = 'applying_tags',
  Complete = 'complete',
}