/**
 * Tauri API Abstraction Layer
 *
 * AIDEV-NOTE: This module provides a drop-in replacement for the Electron IPC bridge (window.Main).
 * It maintains the same interface as the preload script but uses Tauri's invoke() and listen() under the hood.
 *
 * Migration strategy:
 * 1. Replace all `window.Main.*` calls with imports from this file
 * 2. Event listeners change from ipcRenderer.on() to Tauri's listen()
 * 3. All command names must match the #[tauri::command] names in Rust
 *
 * @see src-tauri/src/lib.rs for registered commands
 * @see src/preload/index.ts for original Electron interface
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { open as openDialog, message as messageDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { info as logInfo, warn as logWarn, error as logError, debug as logDebug } from '@tauri-apps/plugin-log';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import type {
  Track,
  Playlist,
  TrackId,
  Config,
  LibraryImportProgress,
  UpdateRatingPayload,
  TrklistCtxMenuPayload,
} from '@renderer/types/harmony';
import type {
  TraktorConfig,
  TraktorSyncProgress,
  TraktorNMLInfo,
  TraktorSyncResult,
  AutoSyncStatus,
  SyncPlan,
  SyncOptions,
} from '@renderer/types/traktor';
import type { DuplicateScanProgress, DuplicateScanResult, TrackFileInfo } from '@renderer/types/duplicates';

/**
 * Parse URI helper - converts file paths to Tauri asset protocol URLs
 * AIDEV-NOTE: In Tauri, local files must be converted using convertFileSrc()
 * to work with the asset protocol (https://asset.localhost/...)
 */
const parseUri = (uri: string): string => {
  // Decode file:// URIs first
  let path = uri;
  if (uri.startsWith('file://')) {
    path = decodeURIComponent(uri.replace('file://', ''));
  }

  // Convert to Tauri asset protocol URL for audio/image loading
  return convertFileSrc(path);
};

/**
 * Default configuration values
 * AIDEV-NOTE: These defaults match the original electron-store defaults.
 * Used when the store has no value for a given key (first launch or reset).
 */
const defaultConfig: Config = {
  audioVolume: 1,
  audioOutputDevice: 'default',
  audioMuted: false,
  sleepBlocker: false,
  displayNotifications: true,
  audioPreCuePosition: 0,
  audioAnalysisWorkers: Math.max(1, (navigator.hardwareConcurrency || 4) - 1),
  tracklistSort: { colId: 'path', mode: 'desc' },
  searchEngines: [],
  theme: 'dark',
  libraryPath: '',
  autoFixMetadata: false,
  useCamelotKeys: false,
  traktorConfig: {
    nmlPath: '',
    syncStrategy: 'smart_merge',
    cueStrategy: 'SMART_MERGE',
    syncOnStartup: false,
    autoBackup: true,
    autoSync: {
      enabled: false,
      direction: 'bidirectional',
      onStartup: false,
      onLibraryChange: false,
      debounceMs: 5000,
    },
  },
  duplicateFinderConfig: {
    criteria: { title: true, artist: true, duration: true },
    durationToleranceSeconds: 2,
    similarityThreshold: 0.85,
  },
  taggerConfig: {
    providers: [],
  },
};

/**
 * Internal store instance — lazily loaded by loadConfig()
 * AIDEV-NOTE: This is the @tauri-apps/plugin-store instance that persists to
 * ~/.local/share/com.github.jvegaf.harmony/settings.json automatically.
 * Do NOT access directly — use the `config` API below.
 */
let _store: Store | null = null;

/**
 * Load the config store and populate __initialConfig.
 * AIDEV-NOTE: MUST be called (and awaited) before React renders, so that
 * player.ts and Zustand stores can read __initialConfig synchronously at
 * module-load time. Called from main.tsx.
 */
export async function loadConfig(): Promise<void> {
  _store = await Store.load('settings.json', {
    autoSave: 100,
    defaults: defaultConfig as unknown as Record<string, unknown>,
  });

  // Build the initial config snapshot from store values, falling back to defaults
  const loaded: Partial<Config> = {};
  for (const key of Object.keys(defaultConfig) as Array<keyof Config>) {
    const val = await _store.get<Config[typeof key]>(key);
    if (val !== null && val !== undefined) {
      (loaded as any)[key] = val;
    }
  }

  config.__initialConfig = { ...defaultConfig, ...loaded };
}

/**
 * Config API
 * AIDEV-NOTE: Uses @tauri-apps/plugin-store for persistence (frontend-only,
 * no Rust commands needed). Replaces the old electron-store approach.
 * - __initialConfig is populated by loadConfig() before app renders
 * - get()/getAll() read from the persisted store (async)
 * - set() writes to the store and also updates __initialConfig in memory
 */
export const config = {
  __initialConfig: null as Config | null,

  async getAll(): Promise<Config> {
    if (!_store) {
      return config.__initialConfig ?? { ...defaultConfig };
    }
    const result: Partial<Config> = {};
    for (const key of Object.keys(defaultConfig) as Array<keyof Config>) {
      const val = await _store.get<Config[typeof key]>(key);
      (result as any)[key] = val !== null && val !== undefined ? val : defaultConfig[key];
    }
    return result as Config;
  },

  async get<T extends keyof Config>(key: T): Promise<Config[T]> {
    if (!_store) {
      return config.__initialConfig?.[key] ?? defaultConfig[key];
    }
    const val = await _store.get<Config[T]>(key);
    return val !== null && val !== undefined ? val : defaultConfig[key];
  },

  async set<T extends keyof Config>(key: T, value: Config[T]): Promise<void> {
    if (_store) {
      await _store.set(key, value);
    }
    // Keep the in-memory snapshot up to date
    if (config.__initialConfig) {
      config.__initialConfig[key] = value;
    }
  },
};

/**
 * App window controls
 * AIDEV-NOTE: Tauri handles these via @tauri-apps/api/window, not commands
 */
export const app = {
  ready: () => {
    // AIDEV-NOTE: In Tauri, the app is ready when the window loads - no explicit signal needed
    console.log('[tauri-api] App ready');
  },

  restart: async () => {
    // AIDEV-NOTE: Tauri uses plugin-process for restart/exit — no custom Rust command needed
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  },

  maximize: async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().toggleMaximize();
  },

  minimize: async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  },

  close: async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  },

  getLogs: async (): Promise<string[]> => {
    // AIDEV-NOTE: No get_app_logs Rust command exists. Tauri plugin-log writes
    // to files in the app data dir. Return empty for now — logs view can read
    // from the log file directly if needed in the future.
    console.warn('[tauri-api] getLogs not yet implemented — Tauri logs to file, not in-memory');
    return [];
  },
};

/**
 * Database API - Tracks
 * AIDEV-NOTE: Commands that don't exist in Rust backend are stubbed with console.warn.
 * Param names must match Rust serde field names exactly (e.g. track_ids, not ids).
 * @see src-tauri/src/commands/tracks.rs for backend signatures
 */
export const tracks = {
  getAll: (): Promise<Track[]> => invoke('get_all_tracks'),

  getRecent: (_days?: number): Promise<Track[]> => {
    // AIDEV-NOTE: No get_recent_tracks command in Rust. Stub: return all tracks
    // and let the caller filter by date if needed.
    console.warn('[tauri-api] getRecent not implemented — returning all tracks');
    return invoke('get_all_tracks');
  },

  insertMultiple: (tracks: Track[]): Promise<Track[]> => {
    // AIDEV-NOTE: insert_tracks returns void but stores expect Track[] back
    return invoke<void>('insert_tracks', { tracks }).then(() => tracks);
  },

  update: (track: Track): Promise<void> => invoke('update_track', { track }),

  updateMultiple: (tracks: Track[]): Promise<void> => {
    // AIDEV-NOTE: No update_tracks_batch command in Rust. Update individually.
    console.warn('[tauri-api] updateMultiple not implemented — updating one by one');
    return Promise.all(tracks.map(t => invoke('update_track', { track: t }))).then(() => {});
  },

  remove: (trackIDs: TrackId[]): Promise<void> => invoke('delete_tracks', { track_ids: trackIDs }),

  findByID: (tracksIDs: string[]): Promise<Track[]> => {
    // AIDEV-NOTE: No get_tracks_by_ids command in Rust. Fetch individually.
    console.warn('[tauri-api] findByID not implemented — fetching one by one');
    return Promise.all(tracksIDs.map(id => invoke<Track | null>('get_track_by_id', { track_id: id }))).then(results =>
      results.filter((t): t is Track => t !== null),
    );
  },

  findByPath: (_paths: string[]): Promise<Track[]> => {
    // AIDEV-NOTE: No get_tracks_by_paths command in Rust. Return empty.
    console.warn('[tauri-api] findByPath not implemented — no backend command');
    return Promise.resolve([]);
  },

  findOnlyByID: (trackID: string): Promise<Track | null> => invoke('get_track_by_id', { track_id: trackID }),

  findOnlyByPath: (_path: string): Promise<Track | null> => {
    // AIDEV-NOTE: No get_track_by_path command in Rust. Return null.
    console.warn('[tauri-api] findOnlyByPath not implemented — no backend command');
    return Promise.resolve(null);
  },
};

/**
 * Database API - Playlists
 * AIDEV-NOTE: Fixed command names to match backend:
 * - insert() now calls 'create_playlist' and returns the playlist (stores expect it back)
 * - rename() now calls 'update_playlist' with updated playlist object
 * - delete_playlist needs playlist_id parameter (not 'id')
 */
export const playlists = {
  getAll: (): Promise<Playlist[]> => invoke('get_all_playlists'),

  insert: async (playlist: Playlist): Promise<Playlist> => {
    // AIDEV-NOTE: Backend returns void, but stores expect the playlist back
    await invoke<void>('create_playlist', { playlist });
    return playlist;
  },

  rename: async (playlistID: string, name: string): Promise<void> => {
    // AIDEV-NOTE: Backend has update_playlist which takes full playlist object
    // We need to fetch, modify, and update
    const playlist = await invoke<Playlist | null>('get_playlist_by_id', { playlist_id: playlistID });
    if (playlist) {
      playlist.name = name;
      await invoke('update_playlist', { playlist });
    }
  },

  remove: (playlistID: string): Promise<void> => invoke('delete_playlist', { playlist_id: playlistID }),

  findByID: async (playlistIDs: string[]): Promise<Playlist[]> => {
    // AIDEV-NOTE: Backend doesn't have get_playlists_by_ids, fetch individually
    const results = await Promise.all(
      playlistIDs.map(id => invoke<Playlist | null>('get_playlist_by_id', { playlist_id: id })),
    );
    return results.filter((p): p is Playlist => p !== null);
  },

  findOnlyByID: (playlistID: string): Promise<Playlist | null> =>
    invoke('get_playlist_by_id', { playlist_id: playlistID }),

  setTracks: (playlistID: string, tracks: Track[]): Promise<void> => {
    // AIDEV-NOTE: Backend expects track IDs, not full Track objects
    const trackIds = tracks.map(t => t.id);
    return invoke('set_playlist_tracks', { playlist_id: playlistID, track_ids: trackIds });
  },

  reorderTracks: (
    playlistID: string,
    tracksToMove: Track[],
    _targetTrack: Track,
    _position: 'above' | 'below',
  ): Promise<void> => {
    // AIDEV-NOTE: Backend expects ordered_track_ids array, not tracks and position
    // This needs to be implemented properly based on the backend signature
    console.warn('[tauri-api] reorderTracks implementation needs backend signature verification');
    const orderedIds = tracksToMove.map(t => t.id);
    return invoke('reorder_playlist_tracks', { playlist_id: playlistID, ordered_track_ids: orderedIds });
  },

  // AIDEV-NOTE: Prune Mode - To Delete Playlist API
  // No dedicated Rust commands for these. Stubbed — they're special playlists
  // that can be managed client-side or via generic playlist commands later.
  getToDeletePlaylist: (): Promise<Playlist | null> => {
    console.warn('[tauri-api] getToDeletePlaylist not implemented — no backend command');
    return Promise.resolve(null);
  },

  addTrackToToDelete: (_trackId: TrackId): Promise<void> => {
    console.warn('[tauri-api] addTrackToToDelete not implemented — no backend command');
    return Promise.resolve();
  },

  removeTrackFromToDelete: (_trackId: TrackId): Promise<void> => {
    console.warn('[tauri-api] removeTrackFromToDelete not implemented — no backend command');
    return Promise.resolve();
  },

  clearToDelete: (): Promise<void> => {
    console.warn('[tauri-api] clearToDelete not implemented — no backend command');
    return Promise.resolve();
  },

  // AIDEV-NOTE: Preparation Mode - Set Preparation Playlist API
  // No dedicated Rust commands for these. Stubbed similarly to to-delete.
  getPreparationPlaylist: (): Promise<Playlist | null> => {
    console.warn('[tauri-api] getPreparationPlaylist not implemented — no backend command');
    return Promise.resolve(null);
  },

  addTrackToPreparation: (_trackId: TrackId): Promise<void> => {
    console.warn('[tauri-api] addTrackToPreparation not implemented — no backend command');
    return Promise.resolve();
  },

  removeTrackFromPreparation: (_trackId: TrackId): Promise<void> => {
    console.warn('[tauri-api] removeTrackFromPreparation not implemented — no backend command');
    return Promise.resolve();
  },

  clearPreparation: (): Promise<void> => {
    console.warn('[tauri-api] clearPreparation not implemented — no backend command');
    return Promise.resolve();
  },
};

/**
 * Database reset
 */
export const db = {
  tracks,
  playlists,
  reset: (): Promise<void> => {
    // AIDEV-NOTE: No reset_database command in Rust backend.
    // Stub: log warning, resolve. Could delete the DB file via shell in the future.
    console.warn('[tauri-api] reset_database not implemented — no backend command');
    return Promise.resolve();
  },
};

/**
 * Library management
 * AIDEV-NOTE: Command name mapping to Rust backend:
 *   scan_folders  → scan_paths (same params)
 *   import_tracks → scan_audio_files_batch (closest equivalent)
 *   import_library_full → import_library (returns ImportResult)
 *   check_library_changes → check_library_changes_cmd (param: library_paths: Vec<String>)
 *   update_track_metadata → write_track_metadata
 *   update_tracks_metadata_batch → write_tracks_metadata_batch
 *   delete_tracks param: ids → track_ids
 *   replace_track_file params: trackId/oldPath/newPath → track_id/track_path/new_file_path
 * @see src-tauri/src/commands/ for backend signatures
 */
export const library = {
  parseUri,

  fixTags: async (track: Track): Promise<Track> => {
    // AIDEV-NOTE: Tagger not yet implemented in Phase 5, return track as-is
    console.warn('[tauri-api] fixTags not implemented yet');
    return track;
  },

  findTagCandidates: async (_tracks: Track[], _options?: { autoApply?: boolean }): Promise<any[]> => {
    // AIDEV-NOTE: Tagger not yet implemented in Phase 5
    console.warn('[tauri-api] findTagCandidates not implemented yet');
    return [];
  },

  applyTagSelections: async (_selections: any[], _tracks: Track[]): Promise<any> => {
    // AIDEV-NOTE: Tagger not yet implemented in Phase 5
    console.warn('[tauri-api] applyTagSelections not implemented yet');
    return { updated: [], errors: [] };
  },

  onTagCandidatesProgress: (_callback: (progress: any) => void): (() => void) => {
    // AIDEV-NOTE: Tagger events not yet implemented
    return () => {};
  },

  onTagAutoApplyComplete: (_callback: (event: any) => void): (() => void) => {
    // AIDEV-NOTE: Tagger events not yet implemented
    return () => {};
  },

  scanPaths: async (paths: string[]): Promise<string[]> => invoke('scan_paths', { paths }),

  importTracks: async (trackPaths: string[]): Promise<Track[]> =>
    invoke('scan_audio_files_batch', { paths: trackPaths }),

  importLibraryFull: async (paths: string[]): Promise<{ success: boolean; tracksAdded: number; error?: string }> =>
    invoke('import_library', { paths }),

  onImportProgress: (callback: (progress: LibraryImportProgress) => void): (() => void) => {
    let unlisten: UnlistenFn | null = null;
    listen<LibraryImportProgress>('library-import-progress', event => {
      callback(event.payload);
    }).then(fn => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  },

  checkChanges: async (libraryPath: string): Promise<any> =>
    invoke('check_library_changes_cmd', { library_paths: [libraryPath] }),

  updateRating: (_payload: UpdateRatingPayload): void => {
    // AIDEV-NOTE: No update_track_rating command in Rust backend. Stub.
    console.warn('[tauri-api] updateRating not implemented — no backend command');
  },

  updateMetadata: async (track: Track): Promise<void> => {
    await invoke('write_track_metadata', { track });
  },

  updateMetadataBatch: async (tracks: Track[]): Promise<void> => invoke('write_tracks_metadata_batch', { tracks }),

  deleteTracks: async (tracks: Track[]): Promise<void> => {
    const trackIds = tracks.map(t => t.id);
    await invoke('delete_tracks', { track_ids: trackIds });
  },

  replaceFile: async (trackId: string, trackPath: string, newFilePath: string): Promise<void> =>
    invoke('replace_track_file', { track_id: trackId, track_path: trackPath, new_file_path: newFilePath }),

  convertKeysToCamelot: (): Promise<void> => {
    // AIDEV-NOTE: No convert_keys_to_camelot command in Rust backend. Stub.
    console.warn('[tauri-api] convertKeysToCamelot not implemented — no backend command');
    return Promise.resolve();
  },

  findSimilars: (_bpTrackId: number): Promise<any> => {
    // AIDEV-NOTE: Tagger not yet implemented
    console.warn('[tauri-api] findSimilars not implemented yet');
    return Promise.resolve([]);
  },
};

/**
 * Dialog API
 * AIDEV-NOTE: Tauri uses plugin-dialog with different option format than Electron
 */
export const dialog = {
  async open(opts: any): Promise<string | string[] | null> {
    // AIDEV-NOTE: Convert Electron OpenDialogOptions to Tauri format
    const result = await openDialog({
      multiple: opts.properties?.includes('openFile') && opts.properties?.includes('multiSelections'),
      directory: opts.properties?.includes('openDirectory'),
      title: opts.title,
      filters: opts.filters?.map((f: any) => ({
        name: f.name,
        extensions: f.extensions,
      })),
    });

    // AIDEV-NOTE: Tauri returns string | string[] | null
    return result;
  },

  async msgbox(opts: any): Promise<any> {
    // AIDEV-NOTE: Convert Electron MessageBoxOptions to Tauri format
    const confirmed = await messageDialog(opts.message, {
      title: opts.title,
      kind: opts.type === 'error' ? 'error' : opts.type === 'warning' ? 'warning' : 'info',
      okLabel: opts.buttons?.[0],
    });

    return { response: confirmed ? 0 : 1 };
  },
};

/**
 * Cover art API
 * AIDEV-NOTE: Rust command is get_track_cover(path, ignore_tags), not get_cover_art.
 * ignore_tags=false means read embedded cover from audio file tags first.
 */
export const covers = {
  getCoverAsBase64: (trackPathOrTrack: string | Track): Promise<string | null> => {
    const path = typeof trackPathOrTrack === 'string' ? trackPathOrTrack : trackPathOrTrack.path;
    return invoke('get_track_cover', { path, ignore_tags: false });
  },
};

/**
 * Logger API
 * AIDEV-NOTE: Tauri uses plugin-log instead of electron-log
 */
export const logger = {
  info: (...params: any[]) => {
    logInfo(params.join(' '));
  },
  warn: (...params: any[]) => {
    logWarn(params.join(' '));
  },
  error: (...params: any[]) => {
    logError(params.join(' '));
  },
  debug: (...params: any[]) => {
    logDebug(params.join(' '));
  },
};

/**
 * Context menus
 * AIDEV-NOTE: In Tauri, context menus can be handled via commands or frontend-only
 * For now, we emit events that the Rust side can listen to
 */
export const menu = {
  tracklist: (payload: TrklistCtxMenuPayload): void => {
    // AIDEV-NOTE: Context menus are better handled in React for flexibility
    // This is a placeholder - actual menu should be rendered in frontend
    console.log('[tauri-api] tracklist menu:', payload);
  },
  common: (): void => {
    console.log('[tauri-api] common menu');
  },
  playlist: (playlistId: string): void => {
    console.log('[tauri-api] playlist menu:', playlistId);
  },
};

/**
 * Shell integration
 * AIDEV-NOTE: No get_user_data_path Rust command. Use @tauri-apps/api/path instead.
 */
export const shell = {
  openExternal: async (url: string): Promise<void> => {
    await openUrl(url);
  },
  openUserDataDirectory: async (): Promise<void> => {
    const { appDataDir } = await import('@tauri-apps/api/path');
    const dataDir = await appDataDir();
    await openUrl(dataDir);
  },
};

/**
 * Audio Analysis API
 * AIDEV-NOTE: Command name mapping:
 *   analyze_audio → analyze_audio_file (param: path, not filePath)
 *   analyze_audio_batch → analyze_audio_batch_command (param: paths, not filePaths)
 * @see src-tauri/src/commands/audio_analysis.rs
 */
export const audioAnalysis = {
  analyze: (filePath: string, options?: any): Promise<any> => invoke('analyze_audio_file', { path: filePath, options }),

  analyzeBatch: (filePaths: string[], options?: any): Promise<any[]> =>
    invoke('analyze_audio_batch_command', { paths: filePaths, options }),

  onProgress: (callback: (progress: any) => void): (() => void) => {
    let unlisten: UnlistenFn | null = null;
    listen<any>('audio-analysis-progress', event => {
      callback(event.payload);
    }).then(fn => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  },

  onTrackComplete: (callback: (track: Track) => void): (() => void) => {
    let unlisten: UnlistenFn | null = null;
    listen<Track>('audio-analysis-track-complete', event => {
      callback(event.payload);
    }).then(fn => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  },
};

/**
 * Traktor NML integration API
 * AIDEV-NOTE: Only parse_traktor_nml and sync_traktor_nml exist in Rust backend.
 * All config/preview/export/auto-sync commands are stubbed.
 * Param mapping: path → nml_path for parse/sync commands.
 * @see src-tauri/src/commands/traktor.rs
 */
export const traktor = {
  getConfig: (): Promise<TraktorConfig> => {
    // AIDEV-NOTE: No get_traktor_config command. Read from frontend config store.
    console.warn('[tauri-api] getConfig not implemented — use config.get("traktorConfig") instead');
    return config.get('traktorConfig') as Promise<TraktorConfig>;
  },

  setConfig: async (traktorCfg: Partial<TraktorConfig>): Promise<TraktorConfig> => {
    // AIDEV-NOTE: No set_traktor_config command. Write to frontend config store.
    console.warn('[tauri-api] setConfig not implemented — using config store');
    const current = await config.get('traktorConfig');
    const merged = { ...current, ...traktorCfg } as TraktorConfig;
    await config.set('traktorConfig', merged);
    return merged;
  },

  selectNmlPath: async (): Promise<string | null> => {
    const result = await openDialog({
      multiple: false,
      directory: false,
      title: 'Select Traktor collection.nml',
      filters: [{ name: 'NML Files', extensions: ['nml'] }],
    });

    // AIDEV-NOTE: Tauri returns string | string[] | null directly
    if (typeof result === 'string') {
      return result;
    }
    return null;
  },

  parseNml: (nmlPath?: string): Promise<TraktorNMLInfo> => invoke('parse_traktor_nml', { nml_path: nmlPath }),

  getSyncPreview: (_nmlPath?: string, _options?: Partial<SyncOptions>): Promise<SyncPlan> => {
    // AIDEV-NOTE: No get_traktor_sync_preview command in Rust backend. Stub.
    console.warn('[tauri-api] getSyncPreview not implemented — no backend command');
    return Promise.resolve({ additions: [], updates: [], deletions: [], conflicts: [] } as unknown as SyncPlan);
  },

  executeSync: (nmlPath?: string, options?: Partial<SyncOptions>): Promise<TraktorSyncResult> =>
    invoke('sync_traktor_nml', { nml_path: nmlPath, strategy: options?.strategy }),

  exportToNml: (_nmlPath?: string): Promise<{ success: boolean }> => {
    // AIDEV-NOTE: No export_to_traktor_nml command in Rust backend. Stub.
    console.warn('[tauri-api] exportToNml not implemented — no backend command');
    return Promise.resolve({ success: false });
  },

  onProgress: (callback: (progress: TraktorSyncProgress) => void): (() => void) => {
    let unlisten: UnlistenFn | null = null;
    listen<TraktorSyncProgress>('traktor-sync-progress', event => {
      callback(event.payload);
    }).then(fn => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  },

  autoSync: {
    start: (): Promise<void> => {
      // AIDEV-NOTE: No start_traktor_auto_sync command in Rust backend. Stub.
      console.warn('[tauri-api] autoSync.start not implemented — no backend command');
      return Promise.resolve();
    },

    stop: (): Promise<void> => {
      // AIDEV-NOTE: No stop_traktor_auto_sync command in Rust backend. Stub.
      console.warn('[tauri-api] autoSync.stop not implemented — no backend command');
      return Promise.resolve();
    },

    getStatus: (): Promise<AutoSyncStatus> => {
      // AIDEV-NOTE: No get_traktor_auto_sync_status command. Return idle status.
      console.warn('[tauri-api] autoSync.getStatus not implemented — returning idle');
      return Promise.resolve({
        enabled: false,
        running: false,
        lastSync: null,
        error: null,
      } as unknown as AutoSyncStatus);
    },

    onStatusChange: (callback: (status: AutoSyncStatus) => void): (() => void) => {
      let unlisten: UnlistenFn | null = null;
      listen<AutoSyncStatus>('traktor-auto-sync-status', event => {
        callback(event.payload);
      }).then(fn => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
  },
};

/**
 * Duplicate Finder API
 */
export const duplicates = {
  find: (_config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult> => {
    // AIDEV-NOTE: Duplicate finder not yet implemented in Phase 5
    console.warn('[tauri-api] Duplicate finder not implemented yet');
    return Promise.resolve({
      groups: [],
      groupCount: 0,
      totalDuplicates: 0,
      totalTracks: 0,
      duplicateCount: 0,
      scanDurationMs: 0,
    });
  },

  getFileInfo: (trackId: string): Promise<TrackFileInfo> => {
    // AIDEV-NOTE: Duplicate finder not yet implemented
    console.warn('[tauri-api] getFileInfo not implemented yet');
    return Promise.resolve({
      trackId,
      id: trackId,
      fileSize: 0,
      size: 0,
      bitrate: 0,
      format: '',
      exists: true,
    } as unknown as TrackFileInfo);
  },

  getCache: (_config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult | null> => {
    // AIDEV-NOTE: Duplicate finder not yet implemented
    return Promise.resolve(null);
  },

  invalidateCache: (): Promise<void> => Promise.resolve(),

  onProgress: (_callback: (progress: DuplicateScanProgress) => void): (() => void) => {
    // AIDEV-NOTE: Duplicate finder events not yet implemented
    return () => {};
  },
};

/**
 * Main API object - drop-in replacement for window.Main
 * AIDEV-NOTE: Export as default to match window.Main structure
 */
export const Main = {
  app,
  config,
  db,
  library,
  playlists,
  dialog,
  covers,
  logger,
  menu,
  shell,
  audioAnalysis,
  traktor,
  duplicates,
};

/**
 * Helper to convert local file paths to Tauri asset URLs
 * AIDEV-NOTE: Required for wavesurfer.js to load audio files
 */
export { convertFileSrc };

export default Main;
