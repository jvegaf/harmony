/**
 * Sistema de scoring unificado para candidatos de tracks
 *
 *   Este scorer es usado por todos los providers (Beatport, Traxsource)
 * para garantizar consistencia en el ranking de candidatos.
 *
 * Algoritmo: Scoring híbrido con ponderación
 * - 50% título (Levenshtein palabra por palabra)
 * - 30% artista (Levenshtein palabra por palabra)
 * - 20% duración (score por rangos)
 */

import { hybridTextSimilarity, calculateDurationScore } from './utils';

export interface ScoringInput {
  localTitle: string;
  localArtist: string;
  localDuration?: number;
  candidateTitle: string;
  candidateArtist: string;
  candidateDuration?: number;
}

export interface ScoringWeights {
  title: number;
  artist: number;
  duration: number;
}

/**
 * Pesos por defecto para el scoring
 * Total debe sumar 1.0
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  title: 0.5,
  artist: 0.3,
  duration: 0.2,
};

/**
 * Clase principal para cálculo de scores de similitud
 */
export class UnifiedScorer {
  constructor(private weights: ScoringWeights = DEFAULT_WEIGHTS) {
    // Validar que los pesos sumen 1.0 (con tolerancia para float precision)
    const sum = weights.title + weights.artist + weights.duration;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Scoring weights must sum to 1.0, got ${sum}`);
    }
  }

  /**
   * Calcula el score de similitud entre un track local y un candidato
   * @returns Score entre 0.0 (sin similitud) y 1.0 (match perfecto)
   */
  calculate(input: ScoringInput): number {
    // Score de título usando algoritmo híbrido
    const titleScore = hybridTextSimilarity(input.localTitle, input.candidateTitle);

    // Score de artista usando algoritmo híbrido
    const artistScore = hybridTextSimilarity(input.localArtist, input.candidateArtist);

    // Score de duración
    const durationScore = calculateDurationScore(input.localDuration, input.candidateDuration);

    // Aplicar ponderación
    const totalScore =
      titleScore * this.weights.title + artistScore * this.weights.artist + durationScore * this.weights.duration;

    return totalScore;
  }

  /**
   * Versión conveniente del método calculate() con parámetros individuales
   */
  calculateFromParams(
    localTitle: string,
    localArtist: string,
    localDuration: number | undefined,
    candidateTitle: string,
    candidateArtist: string,
    candidateDuration: number | undefined,
  ): number {
    return this.calculate({
      localTitle,
      localArtist,
      localDuration,
      candidateTitle,
      candidateArtist,
      candidateDuration,
    });
  }
}

/**
 * Instancia por defecto del scorer
 */
export const defaultScorer = new UnifiedScorer();
