/**
 * Módulo de modelos de datos para integración con Beatport
 *
 * Organizado por responsabilidad:
 * - core: Tipos básicos (OAuth, Artist, Genre, Label)
 * - release: Release e Image
 * - track: Track, Key y SearchResult
 * - tags: Tags extraídos para aplicar
 * - operations: Resultados y progreso de operaciones fix_tags
 * - candidates: Selección manual de candidatos
 */

// Re-exports para acceso directo
export * from './core';
export * from './release';
export * from './track';
export * from './tags';
export * from './operations';
export * from './candidates';