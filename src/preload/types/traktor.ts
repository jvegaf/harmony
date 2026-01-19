/**
 * Traktor Integration Types
 *
 * AIDEV-NOTE: Types shared between main and renderer for Traktor NML integration.
 * These define the configuration, sync progress, and NML info structures.
 */

/**
 * Cue point merge strategy (duplicated here to avoid circular imports)
 * AIDEV-NOTE: Must match CueMergeStrategy in conflict-resolver.ts
 */
export type CueMergeStrategy = 'SMART_MERGE' | 'REPLACE';

/**
 * Traktor configuration stored in app settings
 */
export interface TraktorConfig {
  /** Path to Traktor's collection.nml file */
  nmlPath: string;
  /** Merge strategy for track metadata */
  syncStrategy: 'traktor_wins' | 'harmony_wins' | 'smart_merge';
  /** Merge strategy for cue points */
  cueStrategy: CueMergeStrategy;
  /** Automatically sync on app startup */
  syncOnStartup: boolean;
  /** Create backup before writing to NML */
  autoBackup: boolean;
}

/**
 * Progress update sent during sync operations
 */
export interface TraktorSyncProgress {
  /** Current phase of the operation */
  phase: 'parsing' | 'loading' | 'analyzing' | 'syncing' | 'saving' | 'writing' | 'complete';
  /** Human-readable message */
  message: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Optional: current item being processed */
  currentItem?: string;
}

/**
 * Summary info about a parsed NML file
 */
export interface TraktorNMLInfo {
  /** Path to the NML file */
  path: string;
  /** NML format version */
  version: string;
  /** Total number of tracks */
  trackCount: number;
  /** Total number of playlists */
  playlistCount: number;
  /** Total number of folders */
  folderCount: number;
  /** Total number of cue points across all tracks */
  totalCuePoints: number;
}

/**
 * Sync plan summary for preview UI
 * AIDEV-NOTE: Simplified version of SyncPlan from sync-engine for renderer use
 */
export interface TraktorSyncPlanSummary {
  totalMatched: number;
  tracksWithChanges: number;
  tracksWithNoChanges: number;
  unmatchedTraktor: number;
  tracksToImport: number;
}

/**
 * Sync plan for preview before applying
 * AIDEV-NOTE: Serializable version for IPC (Maps converted to counts)
 */
export interface TraktorSyncPlan {
  /** Summary statistics */
  summary: TraktorSyncPlanSummary;
}

/**
 * Sync result statistics
 */
export interface TraktorSyncResultStats {
  tracksProcessed: number;
  tracksUpdated: number;
  tracksImported: number;
  cuePointsAdded: number;
  fieldsUpdated: Record<string, number>;
}

/**
 * Sync result for UI display
 * AIDEV-NOTE: Simplified version of SyncResult for renderer use
 */
export interface TraktorSyncResult {
  stats: TraktorSyncResultStats;
}
