/**
 * Orchestrator para búsqueda multi-provider de candidatos de tracks
 *
 *  Este orchestrator es el punto central de coordinación.
 * - Busca en paralelo en todos los providers configurados
 * - Aplica scoring unificado a todos los resultados
 * - Retorna los top 4 candidatos globales ordenados por score
 */

import { TrackProvider, RawTrackData } from './types';
import { TrackCandidate, ProviderSource } from '@preload/types/tagger';
import { UnifiedScorer, defaultScorer } from '../scoring';

/**
 * Configuración del orchestrator
 */
export interface OrchestratorConfig {
  /** Número máximo de candidatos a retornar (default: 4) */
  maxCandidates?: number;

  /** Score mínimo para considerar un candidato (default: 0.3) */
  minScore?: number;

  /** Scorer personalizado (default: defaultScorer) */
  scorer?: UnifiedScorer;
}

/**
 * Orchestrator principal para búsqueda multi-provider
 */
export class ProviderOrchestrator {
  private scorer: UnifiedScorer;
  private maxCandidates: number;
  private minScore: number;

  constructor(
    private providers: TrackProvider[],
    config: OrchestratorConfig = {},
  ) {
    this.scorer = config.scorer ?? defaultScorer;
    this.maxCandidates = config.maxCandidates ?? 4;
    this.minScore = config.minScore ?? 0.3;
  }

  /**
   * Busca candidatos en todos los providers configurados
   * @returns Top N candidatos globales ordenados por score
   */
  async findCandidates(title: string, artist: string, durationSecs?: number): Promise<TrackCandidate[]> {
    // 1. Buscar en paralelo en todos los providers
    const searchPromises = this.providers.map(provider => this.searchProvider(provider, title, artist));

    const results = await Promise.allSettled(searchPromises);

    // 2. Combinar resultados raw (exitosos)
    const allRaw: Array<RawTrackData & { source: ProviderSource }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const provider = this.providers[index];
        result.value.forEach(raw => {
          allRaw.push({
            ...raw,
            source: provider.name,
          });
        });
      } else {
        // Log error pero no bloquear
        console.error(`Provider ${this.providers[index].name} failed:`, result.reason);
      }
    });

    // 3. Calcular scores unificados para cada candidato
    const scored = allRaw.map(raw => {
      const score = this.scorer.calculateFromParams(
        title,
        artist,
        durationSecs,
        raw.title,
        raw.artists.join(', '),
        raw.duration_secs,
      );

      return this.rawToCandidate(raw, score);
    });

    // 4. Filtrar por score mínimo, ordenar y tomar top N
    return scored
      .filter(candidate => candidate.similarity_score >= this.minScore)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, this.maxCandidates);
  }

  /**
   * Busca en un provider individual con manejo de errores
   */
  private async searchProvider(provider: TrackProvider, title: string, artist: string): Promise<RawTrackData[]> {
    try {
      return await provider.search(title, artist);
    } catch (error) {
      console.error(`Error searching in ${provider.name}:`, error);
      throw error; // Re-throw para que Promise.allSettled lo capture
    }
  }

  /**
   * Convierte RawTrackData a TrackCandidate con score
   */
  private rawToCandidate(raw: RawTrackData & { source: ProviderSource }, score: number): TrackCandidate {
    return {
      id: raw.id,
      source: raw.source,
      title: raw.title,
      mix_name: raw.mix_name,
      artists: raw.artists.join(', '),
      bpm: raw.bpm,
      key: raw.key,
      duration_secs: raw.duration_secs,
      artwork_url: raw.artwork_url,
      similarity_score: score,
      genre: raw.genre,
      label: raw.label,
      release_date: raw.release_date,
    };
  }
}
