/**
 * Tipos relacionados con selección manual de candidatos de Beatport
 *
 * Incluye: BeatportCandidate, TrackCandidates, TrackSelection, SearchCandidatesResult
 */

import { BeatportTrack, BeatportTrackUtils } from './track';

/**
 * Candidato de Beatport para un track local
 * Contiene información resumida para mostrar en la UI de selección
 */
export interface BeatportCandidate {
  /** ID del track en Beatport */
  beatport_id: number;
  /** Título del track */
  title: string;
  /** Mix name (Original Mix, Extended Mix, etc.) */
  mix_name?: string;
  /** Artistas concatenados */
  artists: string;
  /** BPM detectado */
  bpm?: number;
  /** Key musical */
  key?: string;
  /** Duración en segundos */
  duration_secs?: number;
  /** URL del artwork (thumbnail para UI) */
  artwork_url?: string;
  /** Score de similitud (0.0 - 1.0) */
  similarity_score: number;
  /** Género */
  genre?: string;
  /** Label/Sello */
  label?: string;
  /** Fecha de publicación (YYYY-MM-DD) */
  release_date?: string;
}

/**
 * Utilidades para BeatportCandidate
 */
export class BeatportCandidateUtils {
  /**
   * Crea un candidato desde un BeatportTrack con su score de similitud
   */
  static fromTrack(track: BeatportTrack, score: number): BeatportCandidate {
    const artists = track.artists?.map(a => a.name).join(', ') || '';

    return {
      beatport_id: track.id,
      title: track.name,
      mix_name: track.mix_name,
      artists,
      bpm: track.bpm,
      key: BeatportTrackUtils.getKeyName(track),
      duration_secs: BeatportTrackUtils.getDurationSecs(track),
      artwork_url: BeatportTrackUtils.getArtworkUrl(track, 100), // Thumbnail pequeño
      similarity_score: score,
      genre: BeatportTrackUtils.getGenreName(track),
      label: BeatportTrackUtils.getLabelName(track),
      release_date: track.publish_date,
    };
  }
}

/**
 * Candidatos de Beatport para un track local
 * Agrupa el track local con sus posibles matches de Beatport
 */
export interface TrackCandidates {
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
  /** Lista de candidatos de Beatport (máximo 4) */
  candidates: BeatportCandidate[];
  /** Indica si hubo error al buscar */
  error?: string;
}

/**
 * Utilidades para TrackCandidates
 */
export class TrackCandidatesUtils {
  /**
   * Crea un TrackCandidates con candidatos encontrados
   */
  static withCandidates(
    localTrackId: string,
    localTitle: string,
    localArtist: string,
    localFilename: string | undefined,
    localDuration: number | undefined,
    candidates: BeatportCandidate[],
  ): TrackCandidates {
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
   * Crea un TrackCandidates con error
   */
  static withError(
    localTrackId: string,
    localTitle: string,
    localArtist: string,
    localFilename: string | undefined,
    localDuration: number | undefined,
    error: string,
  ): TrackCandidates {
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
}

/**
 * Selección del usuario para un track
 * El usuario elige qué candidato de Beatport usar (o ninguno)
 */
export interface TrackSelection {
  /** ID del track local en Harmony */
  local_track_id: string;
  /** ID del track de Beatport seleccionado (null = "No está en Beatport") */
  beatport_track_id: number | null;
}

/**
 * Resultado de búsqueda de candidatos para múltiples tracks
 */
export interface SearchCandidatesResult {
  /** Candidatos por cada track */
  tracks: TrackCandidates[];
  /** Total de tracks procesados */
  total: number;
  /** Tracks con al menos un candidato */
  with_candidates: number;
  /** Tracks sin candidatos encontrados */
  without_candidates: number;
}

