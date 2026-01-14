/**
 * Provider de música electrónica
 */
export type ProviderSource = 'beatport' | 'traxsource';

/**
 * Candidato de track desde un provider (Beatport o Traxsource)
 *
 * Este tipo unificado soporta candidatos de múltiples providers,
 * todos con el mismo formato y scoring consistente.
 */
export interface TrackCandidate {
  /** ID del track en el provider */
  id: string;

  /** Fuente del candidato */
  source: ProviderSource;

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

  /** Score de similitud calculado por UnifiedScorer (0.0 - 1.0) */
  similarity_score: number;

  /** Género */
  genre?: string;

  /** Label/Sello */
  label?: string;

  /** Fecha de publicación (YYYY-MM-DD) */
  release_date?: string;
}

/**
 * Utilidades para TrackCandidate
 */
export class TrackCandidateUtils {
  /**
   * Crea un candidato con todos sus campos
   */
  static create(params: TrackCandidate): TrackCandidate {
    return params;
  }

  /**
   * Formatea el ID del track con prefijo del provider
   * @example formatId('123', 'beatport') → 'beatport:123'
   */
  static formatId(id: string, source: ProviderSource): string {
    return `${source}:${id}`;
  }

  /**
   * Parsea un ID formateado y extrae el provider y el ID real
   * @example parseId('beatport:123') → { source: 'beatport', id: '123' }
   */
  static parseId(formattedId: string): { source: ProviderSource; id: string } {
    const [source, ...idParts] = formattedId.split(':');
    return {
      source: source as ProviderSource,
      id: idParts.join(':'), // En caso de que el ID contenga ':'
    };
  }

  /**
   * Obtiene el nombre completo del track (título + mix)
   */
  static getFullTitle(candidate: TrackCandidate): string {
    if (candidate.mix_name) {
      return `${candidate.title} (${candidate.mix_name})`;
    }
    return candidate.title;
  }
}
