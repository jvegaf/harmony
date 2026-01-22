/**
 * IPC Traktor Module
 *
 * AIDEV-NOTE: Provides IPC handlers for Traktor NML integration.
 * Handles parsing collection.nml, syncing with Harmony database,
 * and exporting changes back to Traktor.
 *
 * Channels:
 * - TRAKTOR_GET_CONFIG: Get Traktor configuration (NML path, sync options)
 * - TRAKTOR_SET_CONFIG: Update Traktor configuration
 * - TRAKTOR_SELECT_NML_PATH: Open file dialog to select collection.nml
 * - TRAKTOR_PARSE_NML: Parse NML file and return track/playlist data
 * - TRAKTOR_GET_SYNC_PREVIEW: Preview what will change during sync
 * - TRAKTOR_EXECUTE_SYNC: Execute the sync and persist to database
 * - TRAKTOR_EXPORT_TO_NML: Write Harmony changes back to NML file
 *
 * Events:
 * - TRAKTOR_SYNC_PROGRESS: Progress updates during sync operations
 */

import { dialog, ipcMain } from 'electron';
import log from 'electron-log';

import channels from '../../preload/lib/ipc-channels';
import { Database } from '../lib/db/database';
import {
  TraktorNMLParser,
  TraktorNMLWriter,
  SyncEngine,
  mapTraktorEntryToTrack,
  mapTraktorCuesToHarmony,
  MergeStrategy,
  type SyncOptions,
} from '../lib/traktor';
import type {
  TraktorConfig,
  TraktorSyncProgress,
  TraktorNMLInfo,
  TraktorSyncPlan,
  TraktorSyncResult,
} from '../../preload/types/traktor';
import type { Track } from '../../preload/types/harmony';
import type { CuePoint } from '../../preload/types/cue-point';

import ModuleWindow from './BaseWindowModule';

/**
 * Default Traktor configuration
 */
const DEFAULT_TRAKTOR_CONFIG: TraktorConfig = {
  nmlPath: '',
  syncStrategy: 'smart_merge',
  cueStrategy: 'SMART_MERGE',
  syncOnStartup: false,
  autoBackup: true,
};

/**
 * Module providing IPC handlers for Traktor NML integration
 */
export default class IPCTraktorModule extends ModuleWindow {
  protected db: Database;
  private config: TraktorConfig;

  constructor(window: Electron.BrowserWindow) {
    super(window);
    // AIDEV-NOTE: Use singleton instance to prevent multiple database connections
    this.db = Database.getInstance();
    this.config = { ...DEFAULT_TRAKTOR_CONFIG };
  }

  async load(): Promise<void> {
    // Get Traktor configuration
    ipcMain.handle(channels.TRAKTOR_GET_CONFIG, async (): Promise<TraktorConfig> => {
      log.debug('[IPCTraktor] Getting config');
      return this.config;
    });

    // Set Traktor configuration
    ipcMain.handle(
      channels.TRAKTOR_SET_CONFIG,
      async (_e, newConfig: Partial<TraktorConfig>): Promise<TraktorConfig> => {
        log.info('[IPCTraktor] Updating config:', newConfig);
        this.config = { ...this.config, ...newConfig };
        return this.config;
      },
    );

    // Open file dialog to select NML path
    ipcMain.handle(channels.TRAKTOR_SELECT_NML_PATH, async (): Promise<string | null> => {
      log.info('[IPCTraktor] Opening NML file dialog');

      const result = await dialog.showOpenDialog(this.window, {
        title: 'Select Traktor collection.nml',
        filters: [
          { name: 'Traktor Collection', extensions: ['nml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        log.info('[IPCTraktor] File dialog cancelled');
        return null;
      }

      const nmlPath = result.filePaths[0];
      log.info('[IPCTraktor] Selected NML path:', nmlPath);

      // Update config with new path
      this.config.nmlPath = nmlPath;

      return nmlPath;
    });

    // Parse NML file and return info
    ipcMain.handle(channels.TRAKTOR_PARSE_NML, async (_e, nmlPath?: string): Promise<TraktorNMLInfo> => {
      const pathToUse = nmlPath || this.config.nmlPath;

      if (!pathToUse) {
        throw new Error('No NML path configured');
      }

      log.info('[IPCTraktor] Parsing NML:', pathToUse);

      try {
        const parser = new TraktorNMLParser();
        const nml = await parser.parse(pathToUse);

        const entries = nml.NML.COLLECTION.ENTRY || [];
        const tracks: Track[] = entries.map(entry => mapTraktorEntryToTrack(entry));

        // Extract cue points for each track
        const cuePointsByPath = new Map<string, CuePoint[]>();
        for (const entry of entries) {
          const track = mapTraktorEntryToTrack(entry);
          if (entry.CUE_V2) {
            const cues = Array.isArray(entry.CUE_V2) ? entry.CUE_V2 : [entry.CUE_V2];
            const cuePoints = mapTraktorCuesToHarmony(cues, track.id);
            cuePointsByPath.set(track.path, cuePoints);
          }
        }

        // Count playlists (traverse the tree)
        let playlistCount = 0;
        let folderCount = 0;
        const countNodes = (nodes: unknown[]): void => {
          if (!Array.isArray(nodes)) return;
          for (const node of nodes as Array<{ TYPE?: string; SUBNODES?: { NODE?: unknown[] } }>) {
            if (node.TYPE === 'PLAYLIST') {
              playlistCount++;
            } else if (node.TYPE === 'FOLDER') {
              folderCount++;
              if (node.SUBNODES?.NODE) {
                countNodes(Array.isArray(node.SUBNODES.NODE) ? node.SUBNODES.NODE : [node.SUBNODES.NODE]);
              }
            }
          }
        };

        if (nml.NML.PLAYLISTS?.NODE?.SUBNODES?.NODE) {
          const rootNodes = nml.NML.PLAYLISTS.NODE.SUBNODES.NODE;
          countNodes(Array.isArray(rootNodes) ? rootNodes : [rootNodes]);
        }

        const info: TraktorNMLInfo = {
          path: pathToUse,
          version: nml.NML.VERSION,
          trackCount: tracks.length,
          playlistCount,
          folderCount,
          totalCuePoints: Array.from(cuePointsByPath.values()).reduce((sum, cues) => sum + cues.length, 0),
        };

        log.info('[IPCTraktor] Parsed NML:', info);
        return info;
      } catch (error) {
        log.error('[IPCTraktor] Failed to parse NML:', error);
        throw error;
      }
    });

    // Get sync preview
    ipcMain.handle(
      channels.TRAKTOR_GET_SYNC_PREVIEW,
      async (_e, nmlPath?: string, options?: Partial<SyncOptions>): Promise<TraktorSyncPlan> => {
        const pathToUse = nmlPath || this.config.nmlPath;

        if (!pathToUse) {
          throw new Error('No NML path configured');
        }

        log.info('[IPCTraktor] Getting sync preview for:', pathToUse);

        try {
          // Send progress update
          this.sendProgress({ phase: 'parsing', message: 'Parsing NML file...', progress: 0 });

          // Parse NML
          const parser = new TraktorNMLParser();
          const nml = await parser.parse(pathToUse);

          const entries = nml.NML.COLLECTION.ENTRY || [];
          const traktorTracks: Track[] = entries.map(entry => mapTraktorEntryToTrack(entry));

          this.sendProgress({ phase: 'parsing', message: 'Parsed Traktor collection', progress: 25 });

          // Get cue points from NML
          const traktorCuesByPath = new Map<string, CuePoint[]>();
          for (const entry of entries) {
            const track = mapTraktorEntryToTrack(entry);
            if (entry.CUE_V2) {
              const cues = Array.isArray(entry.CUE_V2) ? entry.CUE_V2 : [entry.CUE_V2];
              const cuePoints = mapTraktorCuesToHarmony(cues, track.id);
              traktorCuesByPath.set(track.path, cuePoints);
            }
          }

          this.sendProgress({ phase: 'loading', message: 'Loading Harmony tracks...', progress: 50 });

          // Get Harmony tracks
          const harmonyTracks = await this.db.getAllTracks();

          // Get Harmony cue points
          const allTrackIds = harmonyTracks.map(t => t.id);
          const harmonyCues = await this.db.getCuePointsByTrackIds(allTrackIds);

          // Group cues by track ID
          const harmonyCuesByTrackId = new Map<string, CuePoint[]>();
          for (const cue of harmonyCues) {
            const existing = harmonyCuesByTrackId.get(cue.trackId) || [];
            existing.push(cue);
            harmonyCuesByTrackId.set(cue.trackId, existing);
          }

          this.sendProgress({ phase: 'analyzing', message: 'Analyzing differences...', progress: 75 });

          // Prepare sync engine with options
          const syncOptions: SyncOptions = {
            strategy: this.mapStrategyToEnum(options?.strategy || this.config.syncStrategy),
            cueStrategy: options?.cueStrategy || this.config.cueStrategy,
            caseInsensitivePaths: process.platform !== 'linux', // Case-insensitive on Windows/macOS
          };

          const engine = new SyncEngine(syncOptions);
          const plan = engine.prepareSyncPlan(harmonyTracks, traktorTracks, harmonyCuesByTrackId, traktorCuesByPath);

          this.sendProgress({ phase: 'complete', message: 'Analysis complete', progress: 100 });

          log.info('[IPCTraktor] Sync preview:', plan.summary);

          // Return serializable version for IPC
          return { summary: plan.summary };
        } catch (error) {
          log.error('[IPCTraktor] Failed to get sync preview:', error);
          throw error;
        }
      },
    );

    // Execute sync
    ipcMain.handle(
      channels.TRAKTOR_EXECUTE_SYNC,
      async (_e, nmlPath?: string, options?: Partial<SyncOptions>): Promise<TraktorSyncResult> => {
        const pathToUse = nmlPath || this.config.nmlPath;

        if (!pathToUse) {
          throw new Error('No NML path configured');
        }

        log.info('[IPCTraktor] Executing sync for:', pathToUse);

        try {
          this.sendProgress({ phase: 'parsing', message: 'Parsing NML file...', progress: 0 });

          // Parse NML
          const parser = new TraktorNMLParser();
          const nml = await parser.parse(pathToUse);

          const entries = nml.NML.COLLECTION.ENTRY || [];
          const traktorTracks: Track[] = entries.map(entry => mapTraktorEntryToTrack(entry));

          // Get cue points from NML
          const traktorCuesByPath = new Map<string, CuePoint[]>();
          for (const entry of entries) {
            const track = mapTraktorEntryToTrack(entry);
            if (entry.CUE_V2) {
              const cues = Array.isArray(entry.CUE_V2) ? entry.CUE_V2 : [entry.CUE_V2];
              const cuePoints = mapTraktorCuesToHarmony(cues, track.id);
              traktorCuesByPath.set(track.path, cuePoints);
            }
          }

          this.sendProgress({ phase: 'loading', message: 'Loading Harmony tracks...', progress: 20 });

          // Get Harmony tracks
          const harmonyTracks = await this.db.getAllTracks();

          // Get Harmony cue points
          const allTrackIds = harmonyTracks.map(t => t.id);
          const harmonyCues = await this.db.getCuePointsByTrackIds(allTrackIds);

          // Group cues by track ID
          const harmonyCuesByTrackId = new Map<string, CuePoint[]>();
          for (const cue of harmonyCues) {
            const existing = harmonyCuesByTrackId.get(cue.trackId) || [];
            existing.push(cue);
            harmonyCuesByTrackId.set(cue.trackId, existing);
          }

          this.sendProgress({ phase: 'syncing', message: 'Syncing tracks...', progress: 40 });

          // Execute sync
          const syncOptions: SyncOptions = {
            strategy: this.mapStrategyToEnum(options?.strategy || this.config.syncStrategy),
            cueStrategy: options?.cueStrategy || this.config.cueStrategy,
            caseInsensitivePaths: process.platform !== 'linux',
          };

          const engine = new SyncEngine(syncOptions);
          const result = engine.executeSync(harmonyTracks, traktorTracks, harmonyCuesByTrackId, traktorCuesByPath);

          this.sendProgress({ phase: 'saving', message: 'Saving to database...', progress: 60 });

          // Save updated tracks to database
          if (result.tracksUpdated.length > 0) {
            for (const track of result.tracksUpdated) {
              await this.db.updateTrack(track);
            }
            log.info('[IPCTraktor] Updated', result.tracksUpdated.length, 'tracks');
          }

          // Save updated cue points to database
          if (result.cuePointsUpdated.length > 0) {
            // Group by track ID and replace
            const cuesByTrack = new Map<string, CuePoint[]>();
            for (const cue of result.cuePointsUpdated) {
              const existing = cuesByTrack.get(cue.trackId) || [];
              existing.push(cue);
              cuesByTrack.set(cue.trackId, existing);
            }

            for (const [trackId, cues] of cuesByTrack) {
              await this.db.replaceCuePointsForTrack(trackId, cues);
            }
            log.info('[IPCTraktor] Updated cue points for', cuesByTrack.size, 'tracks');
          }

          // AIDEV-NOTE: Import new tracks from Traktor that don't exist in Harmony
          if (result.tracksImported.length > 0) {
            this.sendProgress({
              phase: 'saving',
              message: `Importing ${result.tracksImported.length} new tracks...`,
              progress: 75,
            });

            // Filter tracks to only those whose files exist on disk
            const fs = await import('fs/promises');
            const validTracks: Track[] = [];
            const skippedPaths: string[] = [];

            for (const track of result.tracksImported) {
              try {
                await fs.access(track.path);
                validTracks.push(track);
              } catch {
                skippedPaths.push(track.path);
              }
            }

            if (skippedPaths.length > 0) {
              log.warn('[IPCTraktor] Skipped', skippedPaths.length, 'tracks (files not found)');
            }

            // Insert valid tracks
            if (validTracks.length > 0) {
              await this.db.insertTracks(validTracks);
              log.info('[IPCTraktor] Imported', validTracks.length, 'new tracks');

              // Save cue points for imported tracks
              this.sendProgress({
                phase: 'saving',
                message: 'Saving cue points for new tracks...',
                progress: 85,
              });

              for (const track of validTracks) {
                const cues = traktorCuesByPath.get(track.path);
                if (cues && cues.length > 0) {
                  // Update track ID in cue points to match the imported track
                  const cuesWithCorrectId = cues.map(cue => ({ ...cue, trackId: track.id }));
                  await this.db.saveCuePoints(cuesWithCorrectId);
                }
              }
            }

            // Update result stats to reflect actual imports
            result.stats.tracksImported = validTracks.length;
          }

          this.sendProgress({ phase: 'complete', message: 'Sync complete!', progress: 100 });

          log.info('[IPCTraktor] Sync complete:', result.stats);

          // Return serializable version for IPC
          return { stats: result.stats };
        } catch (error) {
          log.error('[IPCTraktor] Sync failed:', error);
          throw error;
        }
      },
    );

    // Export to NML
    ipcMain.handle(channels.TRAKTOR_EXPORT_TO_NML, async (_e, nmlPath?: string): Promise<{ success: boolean }> => {
      const pathToUse = nmlPath || this.config.nmlPath;

      if (!pathToUse) {
        throw new Error('No NML path configured');
      }

      log.info('[IPCTraktor] Exporting to NML:', pathToUse);

      try {
        this.sendProgress({ phase: 'loading', message: 'Loading Harmony data...', progress: 0 });

        // Parse existing NML to preserve structure
        const parser = new TraktorNMLParser();
        const nml = await parser.parse(pathToUse);

        this.sendProgress({ phase: 'loading', message: 'Loading Harmony tracks...', progress: 25 });

        // Get all Harmony tracks
        const harmonyTracks = await this.db.getAllTracks();

        // Get all cue points
        const allTrackIds = harmonyTracks.map(t => t.id);
        const harmonyCues = await this.db.getCuePointsByTrackIds(allTrackIds);

        // Group cues by track ID
        const cuesByTrackId = new Map<string, CuePoint[]>();
        for (const cue of harmonyCues) {
          const existing = cuesByTrackId.get(cue.trackId) || [];
          existing.push(cue);
          cuesByTrackId.set(cue.trackId, existing);
        }

        // Create path-indexed map of Harmony tracks
        const harmonyTracksByPath = new Map<string, Track>();
        for (const track of harmonyTracks) {
          const normalizedPath = this.normalizePath(track.path);
          harmonyTracksByPath.set(normalizedPath, track);
        }

        this.sendProgress({ phase: 'writing', message: 'Building export data...', progress: 50 });

        // Update NML with Harmony track data using the writer's update methods
        const writer = new TraktorNMLWriter();
        let updatedNml = nml;

        for (const entry of nml.NML.COLLECTION.ENTRY) {
          const entryPath = this.traktorPathToSystem(entry.LOCATION.DIR, entry.LOCATION.FILE);
          const normalizedPath = this.normalizePath(entryPath);
          const harmonyTrack = harmonyTracksByPath.get(normalizedPath);

          if (harmonyTrack) {
            const cues = cuesByTrackId.get(harmonyTrack.id);
            updatedNml = writer.updateTrack(updatedNml, harmonyTrack, cues);
          }
        }

        this.sendProgress({ phase: 'writing', message: 'Writing NML file...', progress: 75 });

        // Create backup if enabled
        if (this.config.autoBackup) {
          const backupPath = `${pathToUse}.backup.${Date.now()}.nml`;
          const fs = await import('fs/promises');
          await fs.copyFile(pathToUse, backupPath);
          log.info('[IPCTraktor] Created backup:', backupPath);
        }

        // Write updated NML to file
        await writer.writeToFile(updatedNml, pathToUse);

        this.sendProgress({ phase: 'complete', message: 'Export complete!', progress: 100 });

        log.info('[IPCTraktor] Export complete');
        return { success: true };
      } catch (error) {
        log.error('[IPCTraktor] Export failed:', error);
        throw error;
      }
    });

    log.info('[IPCTraktor] Module loaded');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Send progress update to renderer
   */
  private sendProgress(progress: TraktorSyncProgress): void {
    this.window.webContents.send(channels.TRAKTOR_SYNC_PROGRESS, progress);
  }

  /**
   * Map string strategy to MergeStrategy enum
   */
  private mapStrategyToEnum(strategy: string): MergeStrategy {
    switch (strategy) {
      case 'traktor_wins':
        return MergeStrategy.TRAKTOR_WINS;
      case 'harmony_wins':
        return MergeStrategy.HARMONY_WINS;
      case 'smart_merge':
      default:
        return MergeStrategy.SMART_MERGE;
    }
  }

  /**
   * Normalize path for comparison (case-insensitive on Windows/macOS)
   */
  private normalizePath(path: string): string {
    if (process.platform === 'linux') {
      return path;
    }
    return path.toLowerCase();
  }

  /**
   * Convert Traktor path format to system path
   * Traktor: /:Users/:josev/:Music/:BOX/:
   * System: /Users/josev/Music/BOX/
   */
  private traktorPathToSystem(dir: string, file: string): string {
    // Replace /: with / and remove trailing /:
    const systemDir = dir.replace(/\/:/g, '/').replace(/:$/, '');
    return `${systemDir}${file}`;
  }
}
