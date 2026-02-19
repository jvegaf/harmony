import { contextBridge, ipcRenderer, shell } from 'electron';
import { ElectronAPI, electronAPI } from '@electron-toolkit/preload';
import channels from './lib/ipc-channels';
import {
  Track,
  Playlist,
  LogLevel,
  TrackId,
  TrklistCtxMenuPayload,
  UpdateRatingPayload,
  Config,
} from './types/harmony';
import type {
  TraktorConfig,
  TraktorSyncProgress,
  TraktorNMLInfo,
  TraktorSyncResult,
  AutoSyncStatus,
  SyncPlan,
  SyncOptions,
} from './types/traktor';
import type { DuplicateScanProgress, DuplicateScanResult, TrackFileInfo } from './types/duplicates';
import parseUri from './lib/utils-uri';

const config = {
  __initialConfig: ipcRenderer.sendSync(channels.CONFIG_GET_ALL),
  getAll(): Promise<Config> {
    return ipcRenderer.invoke(channels.CONFIG_GET_ALL);
  },
  get<T extends keyof Config>(key: T): Promise<Config[T]> {
    return ipcRenderer.invoke(channels.CONFIG_GET, key);
  },
  set<T extends keyof Config>(key: T, value: Config[T]): Promise<void> {
    return ipcRenderer.invoke(channels.CONFIG_SET, key, value);
  },
};

const api = {
  app: {
    ready: () => ipcRenderer.send(channels.APP_READY),
    restart: () => ipcRenderer.send(channels.APP_RESTART),
    maximize: () => ipcRenderer.send(channels.APP_MAXIMIZE),
    minimize: () => ipcRenderer.send(channels.APP_MINIMIZE),
    close: () => ipcRenderer.send(channels.APP_CLOSE),
    getLogs: () => ipcRenderer.invoke(channels.APP_GET_LOGS),
  },
  config,
  db: {
    tracks: {
      getAll: () => ipcRenderer.invoke(channels.TRACK_ALL),
      getRecent: (days?: number) => ipcRenderer.invoke(channels.TRACKS_RECENT, days),
      insertMultiple: (tracks: Track[]) => ipcRenderer.invoke(channels.TRACKS_ADD, tracks),
      update: (track: Track) => ipcRenderer.invoke(channels.TRACK_UPDATE, track),
      updateMultiple: (tracks: Track[]) => ipcRenderer.invoke(channels.TRACKS_UPDATE_MULTIPLE, tracks),
      remove: (trackIDs: TrackId[]) => ipcRenderer.invoke(channels.TRACKS_REMOVE, trackIDs),
      findByID: (tracksIDs: string[]) => ipcRenderer.invoke(channels.TRACKS_BY_ID, tracksIDs),
      findByPath: (paths: string[]) => ipcRenderer.invoke(channels.TRACKS_BY_PATH, paths),
      findOnlyByID: (trackID: string) => ipcRenderer.invoke(channels.TRACK_BY_ID, trackID),
      findOnlyByPath: (path: string) => ipcRenderer.invoke(channels.TRACK_BY_PATH, path),
    },
    playlists: {
      getAll: () => ipcRenderer.invoke(channels.PLAYLIST_ALL),
      insert: (playlist: Playlist) => ipcRenderer.invoke(channels.PLAYLIST_ADD, playlist),
      rename: (playlistID: string, name: string) => ipcRenderer.invoke(channels.PLAYLIST_RENAME, playlistID, name),
      remove: (playlistID: string) => ipcRenderer.invoke(channels.PLAYLIST_REMOVE, playlistID),
      findByID: (playlistIDs: string[]) => ipcRenderer.invoke(channels.PLAYLISTS_BY_ID, playlistIDs),
      findOnlyByID: (playlistID: string) => ipcRenderer.invoke(channels.PLAYLIST_BY_ID, playlistID),
      setTracks: (playlistID: string, tracks: Track[]) =>
        ipcRenderer.invoke(channels.PLAYLIST_SET_TRACKS, playlistID, tracks),
      reorderTracks: (playlistID: string, tracksToMove: Track[], targetTrack: Track, position: 'above' | 'below') =>
        ipcRenderer.invoke(channels.PLAYLIST_REORDER_TRACKS, playlistID, tracksToMove, targetTrack, position),
      // Prune Mode - To Delete Playlist API
      getToDeletePlaylist: () => ipcRenderer.invoke(channels.PLAYLIST_TO_DELETE_GET),
      addTrackToToDelete: (trackId: TrackId) => ipcRenderer.invoke(channels.PLAYLIST_TO_DELETE_ADD_TRACK, trackId),
      removeTrackFromToDelete: (trackId: TrackId) =>
        ipcRenderer.invoke(channels.PLAYLIST_TO_DELETE_REMOVE_TRACK, trackId),
      clearToDelete: () => ipcRenderer.invoke(channels.PLAYLIST_TO_DELETE_CLEAR),
      // Preparation Mode - Set Preparation Playlist API
      getPreparationPlaylist: () => ipcRenderer.invoke(channels.PLAYLIST_PREPARATION_GET),
      addTrackToPreparation: (trackId: TrackId) => ipcRenderer.invoke(channels.PLAYLIST_PREPARATION_ADD_TRACK, trackId),
      removeTrackFromPreparation: (trackId: TrackId) =>
        ipcRenderer.invoke(channels.PLAYLIST_PREPARATION_REMOVE_TRACK, trackId),
      clearPreparation: () => ipcRenderer.invoke(channels.PLAYLIST_PREPARATION_CLEAR),
    },
    reset: () => ipcRenderer.invoke(channels.DB_RESET),
  },
  library: {
    parseUri,
    fixTags: async (track: Track) => ipcRenderer.invoke(channels.FIX_TAGS, track),
    findTagCandidates: async (tracks: Track[], options?: { autoApply?: boolean }) => {
      const results = await ipcRenderer.invoke(channels.FIND_TAG_CANDIDATES, tracks, options);
      return results.map((result: any) => ({
        ...result,
        candidates: result.candidates.map((c: any) => ({
          ...c,
          beatport_id: c.source === 'beatport' ? parseInt(c.id) : undefined,
        })),
      }));
    },
    applyTagSelections: async (selections: any[], tracks: Track[]) => {
      return ipcRenderer.invoke(channels.APPLY_TAG_SELECTIONS, selections, tracks);
    },
    // Listen for tag candidates search progress updates
    onTagCandidatesProgress: (callback: (progress: any) => void) => {
      const listener = (_: any, progress: any) => callback(progress);
      ipcRenderer.on(channels.TAG_CANDIDATES_PROGRESS, listener);
      return () => ipcRenderer.removeListener(channels.TAG_CANDIDATES_PROGRESS, listener);
    },
    // Listen for auto-apply progress and completion events
    onTagAutoApplyComplete: (callback: (event: any) => void) => {
      const listener = (_: any, event: any) => callback(event);
      ipcRenderer.on(channels.TAG_AUTO_APPLY_COMPLETE, listener);
      return () => ipcRenderer.removeListener(channels.TAG_AUTO_APPLY_COMPLETE, listener);
    },
    scanPaths: async (paths: string[]) => ipcRenderer.invoke(channels.LIBRARY_LOOKUP, paths),
    importTracks: async (trackPaths: string[]) => ipcRenderer.invoke(channels.LIBRARY_IMPORT_TRACKS, trackPaths),
    importLibraryFull: async (paths: string[]) => ipcRenderer.invoke(channels.LIBRARY_IMPORT_FULL, paths),
    onImportProgress: (callback: (progress: any) => void) => {
      const listener = (_: any, progress: any) => callback(progress);
      ipcRenderer.on(channels.LIBRARY_IMPORT_PROGRESS, listener);
      return () => ipcRenderer.removeListener(channels.LIBRARY_IMPORT_PROGRESS, listener);
    },
    checkChanges: async (libraryPath: string) => ipcRenderer.invoke(channels.LIBRARY_CHECK_CHANGES, libraryPath),
    updateRating: (payload: UpdateRatingPayload) => ipcRenderer.send(channels.TRACK_UPDATE_RATING, payload),
    updateMetadata: async (track: Track) => ipcRenderer.send(channels.TRACK_UPDATE_METADATA, track),
    updateMetadataBatch: async (tracks: Track[]) => ipcRenderer.invoke(channels.TRACKS_UPDATE_METADATA_BATCH, tracks),
    deleteTracks: async (tracks: Track[]) => ipcRenderer.send(channels.TRACKS_DELETE, tracks),
    replaceFile: async (trackId: string, trackPath: string, newFilePath: string) =>
      ipcRenderer.invoke(channels.TRACK_REPLACE_FILE, trackId, trackPath, newFilePath),
    findSimilars: (bpTrackId: number) => ipcRenderer.invoke(channels.TRACK_FIND_SIMILARS, bpTrackId),
  },
  playlists: {
    resolveM3U: (m3uPath: string) => ipcRenderer.invoke(channels.PLAYLISTS_RESOLVE_M3U, m3uPath),
  },
  dialog: {
    open: async (opts: Electron.OpenDialogOptions) => ipcRenderer.invoke(channels.DIALOG_OPEN, opts),
    msgbox: async (opts: Electron.MessageBoxOptions) => ipcRenderer.invoke(channels.DIALOG_MESSAGE_BOX, opts),
  },
  covers: {
    getCoverAsBase64: (track: Track) => ipcRenderer.invoke(channels.COVER_GET, track.path),
  },
  logger: {
    info: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.INFO, params }),
    warn: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.WARN, params }),
    error: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.ERROR, params }),
    debug: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.DEBUG, params }),
  },
  menu: {
    tracklist: (payload: TrklistCtxMenuPayload) => ipcRenderer.send(channels.TRKLIST_MENU_SHOW, payload),
    common: () => ipcRenderer.send(channels.COMMON_MENU_SHOW),
    playlist: (playlistId: string) => ipcRenderer.send(channels.PLAYLIST_MENU_SHOW, playlistId),
  },
  shell: {
    openExternal: shell.openExternal,
    openUserDataDirectory: () => ipcRenderer.invoke(channels.APP_OPEN_USER_DATA),
  },
  audioAnalysis: {
    analyze: (filePath: string, options?: any) => ipcRenderer.invoke(channels.AUDIO_ANALYZE, { filePath, options }),
    analyzeBatch: (filePaths: string[], options?: any) =>
      ipcRenderer.invoke(channels.AUDIO_ANALYZE_BATCH, { filePaths, options }),
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_: any, progress: any) => callback(progress);
      ipcRenderer.on(channels.AUDIO_ANALYSIS_PROGRESS, listener);
      return () => ipcRenderer.removeListener(channels.AUDIO_ANALYSIS_PROGRESS, listener);
    },
    // Listen for individual track completion events for real-time UI updates
    onTrackComplete: (callback: (track: Track) => void) => {
      const listener = (_: any, track: Track) => callback(track);
      ipcRenderer.on(channels.AUDIO_ANALYSIS_TRACK_COMPLETE, listener);
      return () => ipcRenderer.removeListener(channels.AUDIO_ANALYSIS_TRACK_COMPLETE, listener);
    },
  },
  /**
   * Traktor NML integration API
   * Provides sync between Harmony and Traktor's collection.nml
   */
  traktor: {
    /** Get current Traktor configuration */
    getConfig: (): Promise<TraktorConfig> => ipcRenderer.invoke(channels.TRAKTOR_GET_CONFIG),
    /** Update Traktor configuration */
    setConfig: (config: Partial<TraktorConfig>): Promise<TraktorConfig> =>
      ipcRenderer.invoke(channels.TRAKTOR_SET_CONFIG, config),
    /** Open file dialog to select collection.nml path */
    selectNmlPath: (): Promise<string | null> => ipcRenderer.invoke(channels.TRAKTOR_SELECT_NML_PATH),
    /** Parse NML file and return summary info */
    parseNml: (nmlPath?: string): Promise<TraktorNMLInfo> => ipcRenderer.invoke(channels.TRAKTOR_PARSE_NML, nmlPath),
    /** Get sync preview showing what will change */
    getSyncPreview: (nmlPath?: string, options?: Partial<SyncOptions>): Promise<SyncPlan> =>
      ipcRenderer.invoke(channels.TRAKTOR_GET_SYNC_PREVIEW, nmlPath, options),
    /** Execute sync and persist to database */
    executeSync: (nmlPath?: string, options?: Partial<SyncOptions>): Promise<TraktorSyncResult> =>
      ipcRenderer.invoke(channels.TRAKTOR_EXECUTE_SYNC, nmlPath, options),
    /** Export Harmony changes back to NML file */
    exportToNml: (nmlPath?: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(channels.TRAKTOR_EXPORT_TO_NML, nmlPath),
    /** Listen for sync progress updates */
    onProgress: (callback: (progress: TraktorSyncProgress) => void) => {
      const listener = (_: any, progress: TraktorSyncProgress) => callback(progress);
      ipcRenderer.on(channels.TRAKTOR_SYNC_PROGRESS, listener);
      return () => ipcRenderer.removeListener(channels.TRAKTOR_SYNC_PROGRESS, listener);
    },
    /**
     * Auto-sync API
     * Background synchronization with Traktor
     */
    autoSync: {
      /** Start auto-sync manually */
      start: (): Promise<void> => ipcRenderer.invoke(channels.TRAKTOR_AUTO_SYNC_START),
      /** Stop auto-sync (cancels pending debounced syncs) */
      stop: (): Promise<void> => ipcRenderer.invoke(channels.TRAKTOR_AUTO_SYNC_STOP),
      /** Get current auto-sync status */
      getStatus: (): Promise<AutoSyncStatus> => ipcRenderer.invoke(channels.TRAKTOR_AUTO_SYNC_GET_STATUS),
      /** Listen for auto-sync status updates */
      onStatusChange: (callback: (status: AutoSyncStatus) => void) => {
        const listener = (_: any, status: AutoSyncStatus) => callback(status);
        ipcRenderer.on(channels.TRAKTOR_AUTO_SYNC_STATUS, listener);
        return () => ipcRenderer.removeListener(channels.TRAKTOR_AUTO_SYNC_STATUS, listener);
      },
    },
  },
  /**
   * Duplicate Finder API
   * Detects and manages duplicate tracks in the library
   */
  duplicates: {
    /** Scan library for duplicates using configured criteria */
    find: (config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult> =>
      ipcRenderer.invoke(channels.DUPLICATES_FIND, config),
    /** Get file info for a specific track */
    getFileInfo: (trackId: string): Promise<TrackFileInfo> =>
      ipcRenderer.invoke(channels.DUPLICATES_GET_FILE_INFO, trackId),
    /** Get cached scan results if available and valid */
    getCache: (config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult | null> =>
      ipcRenderer.invoke(channels.DUPLICATES_GET_CACHE, config),
    /** Invalidate the cache (called when tracks are added/removed) */
    invalidateCache: (): Promise<void> => ipcRenderer.invoke(channels.DUPLICATES_INVALIDATE_CACHE),
    /** Listen for scan progress updates */
    onProgress: (callback: (progress: DuplicateScanProgress) => void) => {
      const listener = (_: any, progress: DuplicateScanProgress) => callback(progress);
      ipcRenderer.on(channels.DUPLICATES_SCAN_PROGRESS, listener);
      return () => ipcRenderer.removeListener(channels.DUPLICATES_SCAN_PROGRESS, listener);
    },
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('ElectronAPI', electronAPI);
    contextBridge.exposeInMainWorld('Main', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.ElectronAPI = electronAPI;
  // @ts-ignore (define in dts)
  window.Main = api;
}

declare global {
  interface Window {
    ElectronAPI: ElectronAPI;
    Main: typeof api;
  }
}
