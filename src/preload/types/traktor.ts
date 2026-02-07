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
  /**
   * AIDEV-NOTE: Flag indicating there are pending changes in Harmony
   * that need to be exported to Traktor. Set by library event handlers,
   * cleared after successful export.
   */
  hasPendingExportChanges?: boolean;
  /**
   * AIDEV-NOTE: Auto-sync configuration for background synchronization
   * When enabled, Harmony will automatically sync with Traktor in the background
   */
  autoSync: {
    /** Enable automatic background sync */
    enabled: boolean;
    /** Sync direction: import from Traktor, export to Traktor, or both */
    direction: 'import' | 'export' | 'bidirectional';
    /** Trigger sync on app startup (after initial load) */
    onStartup: boolean;
    /** Trigger sync when library changes (tracks added/removed/updated) */
    onLibraryChange: boolean;
    /** Debounce delay in ms before syncing after library change */
    debounceMs: number;
  };
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
  playlistsImported: number;
  fieldsUpdated: Record<string, number>;
}

/**
 * Sync result for UI display
 * AIDEV-NOTE: Simplified version of SyncResult for renderer use
 */
export interface TraktorSyncResult {
  stats: TraktorSyncResultStats;
}

/**
 * Auto-sync status for tracking background sync state
 * AIDEV-NOTE: Used by renderer to display sync status in notification
 */
export interface AutoSyncStatus {
  /** Whether auto-sync is currently running */
  isRunning: boolean;
  /** Current phase of sync (if running) */
  phase?: TraktorSyncProgress['phase'];
  /** Progress percentage 0-100 */
  progress: number;
  /** Human-readable message */
  message: string;
  /** Direction of current sync */
  direction?: 'import' | 'export';
  /** Timestamp of last successful sync */
  lastSyncTime?: number;
  /** Error message if last sync failed */
  lastError?: string;
}
