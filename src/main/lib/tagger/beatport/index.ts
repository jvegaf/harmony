/**
 * Módulo de integración con Beatport en TypeScript
 *
 * Proporciona funcionalidad para buscar tracks en Beatport y aplicar
 * metadatos automáticamente a archivos de audio locales.
 */

// Re-exports principales
export * from "./models";
export * from "./client";
export * from "./error";
export * from "./tagger";
export * from "./tag-writer";
export * from "./tag-merge";

// Re-export del cliente por defecto para uso fácil
export { defaultClient } from "./client/client";

// Re-export del tagger por defecto para uso fácil
export { BeatportTagger } from "./tagger";
