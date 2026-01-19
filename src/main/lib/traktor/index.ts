/**
 * Traktor NML Integration Module
 *
 * Provides parsing, writing, and synchronization of Traktor Pro's collection.nml
 * with Harmony's internal database.
 */

// Types
export * from './types/nml-types';

// Mappers
export * from './mappers/key-mapper';
export * from './mappers/track-mapper';
export {
  mapTraktorCueType,
  mapTraktorCueToHarmony,
  mapTraktorCuesToHarmony,
  extractBeatGrid,
  mapHarmonyCueToTraktor,
} from './mappers/cue-mapper';
export * from './mappers/playlist-mapper';

// Parser & Writer
export { TraktorNMLParser } from './nml-parser';
export { TraktorNMLWriter, escapeXml, formatTraktorDate, buildCueXml, buildEntryXml } from './nml-writer';

// Sync
export { mergeTrack, mergeCuePoints, MergeStrategy } from './sync/conflict-resolver';
export type { MergeResult, CueMergeResult, CueMergeStrategy } from './sync/conflict-resolver';
export { SyncEngine } from './sync/sync-engine';
export type { SyncOptions, SyncResult, SyncPlan, TrackSyncResult, TrackMatchResult } from './sync/sync-engine';
