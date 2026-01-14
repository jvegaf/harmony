/**
 * Capa de compatibilidad para tipos legacy de Beatport
 *
 *   Este módulo proporciona compatibilidad hacia atrás con el tipo
 * BeatportCandidate mientras el frontend se migra a TrackCandidate.
 *
 * TODO: Una vez el frontend esté completamente migrado, este archivo se puede eliminar.
 */

import { TrackCandidate, TrackCandidatesResult, TrackSelection as NewTrackSelection } from '../tagger';

/**
 * Alias de compatibilidad: BeatportCandidate → TrackCandidate
 * @deprecated Use TrackCandidate from 'src/preload/types/tagger' instead
 */
export type BeatportCandidate = TrackCandidate & {
  /** ID específico de Beatport (para compatibilidad) */
  beatport_id?: number;
};

/**
 * Alias de compatibilidad: TrackCandidates → TrackCandidatesResult
 * @deprecated Use TrackCandidatesResult from 'src/preload/types/tagger' instead
 */
export type TrackCandidates = Omit<TrackCandidatesResult, 'candidates'> & {
  /** Candidatos con formato compatible */
  candidates: BeatportCandidate[];
};

/**
 * TrackSelection compatible con nuevo sistema
 */
export interface TrackSelection {
  /** ID del track local */
  local_track_id: string;
  /** ID del track de Beatport seleccionado (null = "No está en Beatport") */
  beatport_track_id: number | null;
  /** ID del track de Traxsource seleccionado (si aplica) */
  traxsource_track_id?: string | null;
}

/**
 * Convierte TrackCandidate (nuevo) a BeatportCandidate (legacy)
 */
export function trackCandidateToBeatportCandidate(candidate: TrackCandidate): BeatportCandidate {
  return {
    ...candidate,
    beatport_id: candidate.source === 'beatport' ? parseInt(candidate.id) : undefined,
  };
}

/**
 * Convierte TrackCandidatesResult (nuevo) a TrackCandidates (legacy)
 */
export function trackCandidatesResultToLegacy(result: TrackCandidatesResult): TrackCandidates {
  return {
    ...result,
    candidates: result.candidates.map(trackCandidateToBeatportCandidate),
  };
}

/**
 * Convierte TrackSelection (legacy) a NewTrackSelection (nuevo)
 */
export function legacySelectionToNew(selection: TrackSelection): NewTrackSelection {
  // Determinar el ID del candidato seleccionado
  let selectedCandidateId: string | null = null;

  if (selection.beatport_track_id !== null) {
    selectedCandidateId = `beatport:${selection.beatport_track_id}`;
  } else if (selection.traxsource_track_id) {
    selectedCandidateId = `traxsource:${selection.traxsource_track_id}`;
  }

  return {
    local_track_id: selection.local_track_id,
    selected_candidate_id: selectedCandidateId,
  };
}

/**
 * Utilities para trabajar con candidatos compatibles
 */
export class BeatportCandidateUtils {
  /**
   * Obtiene el ID numérico de Beatport de un candidato
   */
  static getBeatportId(candidate: BeatportCandidate): number | undefined {
    if (candidate.beatport_id !== undefined) {
      return candidate.beatport_id;
    }
    if (candidate.source === 'beatport') {
      return parseInt(candidate.id);
    }
    return undefined;
  }
}
