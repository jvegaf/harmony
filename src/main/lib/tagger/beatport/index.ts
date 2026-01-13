/**
 * Módulo de integración con Beatport en TypeScript
 *
 * Proporciona funcionalidad para buscar tracks en Beatport y aplicar
 * metadatos automáticamente a archivos de audio locales.
 */

// Re-exports principales
export * from './client';
export * from './error';

// Re-export del cliente por defecto para uso fácil
export { defaultClient } from './client/client';
