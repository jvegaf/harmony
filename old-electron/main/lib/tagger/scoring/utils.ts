/**
 * Utilidades para scoring de candidatos de tracks
 *
 *   Este módulo contiene funciones compartidas para normalización
 * y cálculo de similitud entre strings, usado por todos los providers.
 */

/**
 * Normaliza un string para comparación (lowercase + alphanumeric + whitespace)
 */
export function normalizeString(s: string): string {
  if (!s || typeof s !== 'string') {
    return '';
  }
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Solo alfanumérico y espacios
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}

/**
 * Calcula la similitud entre dos strings usando distancia de Levenshtein (0.0 - 1.0)
 * @returns Score de similitud donde 1.0 es match perfecto
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1.0;
  }
  if (a.length === 0 || b.length === 0) {
    return 0.0;
  }

  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // inserción
        matrix[j - 1][i] + 1, // eliminación
        matrix[j - 1][i - 1] + cost, // sustitución
      );
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return 1.0 - distance / maxLength;
}

/**
 * Calcula el score de similitud híbrido entre dos strings
 * usando Levenshtein palabra por palabra
 *
 *   Este algoritmo híbrido combina lo mejor de ambos mundos:
 * - Usa Levenshtein (preciso para typos) en lugar de token overlap
 * - Compara palabra por palabra para ser flexible con reordenamiento
 *
 * @example
 * hybridTextSimilarity("strobe deadmau5", "deadmau5 strobe") → ~1.0
 * hybridTextSimilarity("hello world", "helo wrld") → ~0.8
 */
export function hybridTextSimilarity(query: string, candidate: string): number {
  const queryNorm = normalizeString(query);
  const candidateNorm = normalizeString(candidate);

  // Caso trivial: match exacto
  if (queryNorm === candidateNorm) {
    return 1.0;
  }

  const queryWords = queryNorm.split(/\s+/).filter(Boolean);
  const candidateWords = candidateNorm.split(/\s+/).filter(Boolean);

  if (queryWords.length === 0 || candidateWords.length === 0) {
    return 0.0;
  }

  // Para cada palabra del query, encontrar mejor match en candidate
  const wordScores = queryWords.map(qw => {
    const scores = candidateWords.map(cw => levenshteinSimilarity(qw, cw));
    return Math.max(...scores);
  });

  // Promedio de los mejores matches
  return wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length;
}

/**
 * Calcula el score de duración entre dos tracks
 * @returns Score donde 1.0 es duración casi idéntica, 0.2 es muy diferente
 */
export function calculateDurationScore(localDuration: number | undefined, remoteDuration: number | undefined): number {
  if (!localDuration || !remoteDuration) {
    return 0.7; // Score neutral si no hay duración para comparar
  }

  const diff = Math.abs(localDuration - remoteDuration);

  if (diff <= 5) {
    return 1.0; // Match casi perfecto
  } else if (diff <= 15) {
    return 0.8; // Diferencia aceptable (fade in/out diferentes)
  } else if (diff <= 30) {
    return 0.5; // Podría ser edit o versión diferente
  } else {
    return 0.2; // Probablemente versión muy diferente
  }
}
