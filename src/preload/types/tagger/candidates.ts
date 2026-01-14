import { TrackCandidate } from './candidate';

/**
 * Candidatos de múltiples providers para un track local
 * Agrupa el track local con sus posibles matches (top 4 globales)
 */
export interface TrackCandidatesResult {
  /** ID del track local en Harmony */
  local_track_id: string;

  /** Título del track local */
  local_title: string;

  /** Artista del track local */
  local_artist: string;

  /** Nombre del archivo local */
  local_filename?: string;

  /** Duración del track local en segundos */
  local_duration?: number;

  /** Lista de candidatos de TODOS los providers (máximo 4, ordenados por score) */
  candidates: TrackCandidate[];

  /** Indica si hubo error al buscar */
  error?: string;
}

/**
 * Utilidades para TrackCandidatesResult
 */
export class TrackCandidatesResultUtils {
  /**
   * Crea un TrackCandidatesResult con candidatos encontrados
   */
  static withCandidates(
    localTrackId: string,
    localTitle: string,
    localArtist: string,
    localFilename: string | undefined,
    localDuration: number | undefined,
    candidates: TrackCandidate[],
  ): TrackCandidatesResult {
    return {
      local_track_id: localTrackId,
      local_title: localTitle,
      local_artist: localArtist,
      local_filename: localFilename,
      local_duration: localDuration,
      candidates,
      error: undefined,
    };
  }

  /**
   * Crea un TrackCandidatesResult con error
   */
  static withError(
    localTrackId: string,
    localTitle: string,
    localArtist: string,
    localFilename: string | undefined,
    localDuration: number | undefined,
    error: string,
  ): TrackCandidatesResult {
    return {
      local_track_id: localTrackId,
      local_title: localTitle,
      local_artist: localArtist,
      local_filename: localFilename,
      local_duration: localDuration,
      candidates: [],
      error,
    };
  }

  /**
   * Obtiene el mejor candidato (mayor score)
   */
  static getBestCandidate(result: TrackCandidatesResult): TrackCandidate | undefined {
    return result.candidates[0];
  }

  /**
   * Filtra candidatos por provider
   */
  static filterBySource(result: TrackCandidatesResult, source: string): TrackCandidate[] {
    return result.candidates.filter(c => c.source === source);
  }
}

/**
 * Selección del usuario para un track
 * El usuario elige qué candidato usar (de cualquier provider)
 */
export interface TrackSelection {
  /** ID del track local en Harmony */
  local_track_id: string;

  /** ID del candidato seleccionado en formato 'provider:id' (null = "No está disponible") */
  selected_candidate_id: string | null;
}

/**
 * Resultado de búsqueda de candidatos para múltiples tracks
 */
export interface SearchCandidatesResult {
  /** Candidatos por cada track */
  tracks: TrackCandidatesResult[];

  /** Total de tracks procesados */
  total: number;

  /** Tracks con al menos un candidato */
  with_candidates: number;

  /** Tracks sin candidatos encontrados */
  without_candidates: number;
}
