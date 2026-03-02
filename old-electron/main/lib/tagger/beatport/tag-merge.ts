/**
 * Lógica de merge inteligente para tags de audio
 *
 * Decide qué datos preservar del archivo local vs qué datos aplicar de Beatport
 */

import { BeatportTags } from '../../../../preload/types/beatport';

/**
 * Resultado del merge de tags
 */
export interface MergeResult {
  /** Tags finales a aplicar */
  merged: BeatportTags;
  /** Campos que se preservaron del archivo original */
  preserved: string[];
  /** Campos que se sobrescribieron con datos de Beatport */
  overwritten: string[];
}

/**
 * Aplica lógica de merge inteligente entre tags de Beatport y datos locales
 *
 * @param beatportTags - Tags obtenidos de Beatport
 * @param localBpm - BPM actual del archivo local (si existe)
 * @param localGenre - Género actual del archivo local (si existe)
 * @param localAlbum - Álbum actual del archivo local (si existe)
 * @param localYear - Año actual del archivo local (si existe)
 */
export function mergeTags(
  beatportTags: BeatportTags,
  localBpm: number | undefined,
  localGenre: string | undefined,
  localAlbum: string | undefined,
  localYear: number | undefined,
): BeatportTags {
  const result: MergeResult = {
    merged: { ...beatportTags },
    preserved: [],
    overwritten: [],
  };

  // Lógica de merge para BPM
  if (shouldPreserveBpm(localBpm, beatportTags.bpm)) {
    result.merged.bpm = localBpm;
    result.preserved.push('bpm');
  } else if (beatportTags.bpm !== undefined) {
    result.overwritten.push('bpm');
  }

  // Lógica de merge para género
  if (shouldPreserveGenre(localGenre, beatportTags.genre)) {
    result.merged.genre = localGenre;
    result.preserved.push('genre');
  } else if (beatportTags.genre !== undefined) {
    result.overwritten.push('genre');
  }

  // Lógica de merge para álbum
  if (shouldPreserveAlbum(localAlbum, beatportTags.album)) {
    result.merged.album = localAlbum;
    result.preserved.push('album');
  } else if (beatportTags.album !== undefined) {
    result.overwritten.push('album');
  }

  // Lógica de merge para año
  if (shouldPreserveYear(localYear, beatportTags.year)) {
    result.merged.year = localYear;
    result.preserved.push('year');
  } else if (beatportTags.year !== undefined) {
    result.overwritten.push('year');
  }

  // Campos que SIEMPRE se sobrescriben con datos de Beatport
  const alwaysOverwrite = ['title', 'artist', 'key', 'label', 'isrc', 'catalog_number', 'artwork_url', 'artwork_data'];
  alwaysOverwrite.forEach(field => {
    if ((beatportTags as any)[field] !== undefined) {
      result.overwritten.push(field);
    }
  });

  return result.merged;
}

/**
 * Decide si preservar el BPM local o usar el de Beatport
 *
 * Preserva BPM local si:
 * - El local existe y el de Beatport no
 * - Ambos existen pero están muy diferentes (posible corrección manual)
 * - El BPM local está en un rango válido y el de Beatport parece inválido
 */
function shouldPreserveBpm(localBpm: number | undefined, beatportBpm: number | undefined): boolean {
  if (!localBpm) return false; // No hay BPM local
  if (!beatportBpm) return true; // No hay BPM de Beatport, preservar local

  // Si la diferencia es muy grande (>20 BPM), asumir que el local es una corrección manual
  const diff = Math.abs(localBpm - beatportBpm);
  if (diff > 20) {
    return true;
  }

  // Si el BPM de Beatport parece inválido (demasiado alto/bajo)
  if (beatportBpm < 60 || beatportBpm > 200) {
    return true;
  }

  // Si el BPM local parece inválido, usar el de Beatport
  if (localBpm < 60 || localBpm > 200) {
    return false;
  }

  // Por defecto, usar el de Beatport (más confiable)
  return false;
}

/**
 * Decide si preservar el género local o usar el de Beatport
 *
 * Preserva género local si:
 * - El usuario ha especificado un género específico que difiere del de Beatport
 * - El género local parece ser una corrección manual
 */
function shouldPreserveGenre(localGenre: string | undefined, beatportGenre: string | undefined): boolean {
  if (!localGenre) return false;
  if (!beatportGenre) return true;

  // Normalizar para comparación
  const localNorm = localGenre.toLowerCase().trim();
  const beatportNorm = beatportGenre.toLowerCase().trim();

  // Si son iguales, usar Beatport
  if (localNorm === beatportNorm) {
    return false;
  }

  // Si el género local es más específico o diferente intencionalmente, preservarlo
  // Por ejemplo: local="Minimal Techno" vs beatport="Techno"
  if (localNorm.includes(beatportNorm) || beatportNorm.includes(localNorm)) {
    // Si el local es más específico, preservarlo
    return localNorm.length > beatportNorm.length;
  }

  // Géneros muy diferentes - asumir corrección manual
  return true;
}

/**
 * Decide si preservar el álbum local o usar el de Beatport
 *
 * Generalmente usa el de Beatport, pero preserva si parece ser una edición especial
 */
function shouldPreserveAlbum(localAlbum: string | undefined, beatportAlbum: string | undefined): boolean {
  if (!localAlbum) return false;
  if (!beatportAlbum) return true;

  const localNorm = localAlbum.toLowerCase().trim();
  const beatportNorm = beatportAlbum.toLowerCase().trim();

  // Si son iguales, usar Beatport
  if (localNorm === beatportNorm) {
    return false;
  }

  // Si el álbum local incluye información extra (edición, remix, etc.), preservarlo
  if (localNorm.includes(beatportNorm) && localNorm.length > beatportNorm.length) {
    return true;
  }

  // Por defecto, usar Beatport
  return false;
}

/**
 * Decide si preservar el año local o usar el de Beatport
 *
 * Preserva año local si:
 * - Es significativamente diferente (posible reedición)
 * - El año de Beatport parece inválido
 */
function shouldPreserveYear(localYear: number | undefined, beatportYear: number | undefined): boolean {
  if (!localYear) return false;
  if (!beatportYear) return true;

  const currentYear = new Date().getFullYear();

  // Si el año de Beatport parece inválido
  if (beatportYear < 1900 || beatportYear > currentYear + 1) {
    return true;
  }

  // Si el año local parece inválido, usar Beatport
  if (localYear < 1900 || localYear > currentYear + 1) {
    return false;
  }

  // Si la diferencia es significativa (>2 años), preservar local (posible reedición)
  const diff = Math.abs(localYear - beatportYear);
  if (diff > 2) {
    return true;
  }

  // Por defecto, usar Beatport
  return false;
}

/**
 * Obtiene estadísticas del merge para logging/debugging
 */
export function getMergeStats(result: MergeResult): {
  totalFields: number;
  preservedCount: number;
  overwrittenCount: number;
  preservationRate: number;
} {
  const allFields = [
    'title',
    'artist',
    'album',
    'year',
    'genre',
    'bpm',
    'key',
    'label',
    'isrc',
    'catalog_number',
    'artwork_url',
    'artwork_data',
  ];

  const totalFields = allFields.length;
  const preservedCount = result.preserved.length;
  const overwrittenCount = result.overwritten.length;

  return {
    totalFields,
    preservedCount,
    overwrittenCount,
    preservationRate: preservedCount / totalFields,
  };
}
