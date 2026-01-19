/**
 * IPC Audio Analysis Module
 *
 * AIDEV-NOTE: Provides IPC handlers for manual audio analysis with parallel processing.
 * Uses AudioAnalysisWorkerPool for efficient batch processing with progress reporting.
 * Automatically saves BPM, Key, and Waveform data to the database after analysis.
 *
 * Channels:
 * - AUDIO_ANALYZE: Analyze a single track
 * - AUDIO_ANALYZE_BATCH: Analyze multiple tracks in parallel with progress events
 *
 * Events:
 * - AUDIO_ANALYSIS_PROGRESS: Progress updates during batch analysis
 */

import { ipcMain } from 'electron';
import log from 'electron-log';

import channels from '../../preload/lib/ipc-channels';
import { getWorkerPool, AudioAnalysisResult, AudioAnalysisOptions } from '../lib/audio-analysis';
import { Database } from '../lib/db/database';

import ModuleWindow from './BaseWindowModule';

/**
 * Request payload for single track analysis
 */
interface AnalyzeRequest {
  /** Path to the audio file */
  filePath: string;
  /** Optional analysis options */
  options?: AudioAnalysisOptions;
  /** Optional pool size override */
  poolSize?: number;
}

/**
 * Request payload for batch analysis
 */
interface AnalyzeBatchRequest {
  /** Array of file paths to analyze */
  filePaths: string[];
  /** Optional analysis options (applied to all) */
  options?: AudioAnalysisOptions;
  /** Optional pool size (number of parallel workers) */
  poolSize?: number;
}

/**
 * Result of batch analysis
 */
interface BatchAnalysisResult {
  /** Results keyed by file path */
  results: Record<string, AudioAnalysisResult>;
  /** Errors keyed by file path */
  errors: Record<string, string>;
}

/**
 * Progress event payload
 */
interface AnalysisProgressEvent {
  completed: number;
  total: number;
  currentFile: string;
  percentage: number;
}

/**
 * Module providing IPC handlers for audio analysis with parallel processing
 */
export default class IPCAudioAnalysisModule extends ModuleWindow {
  protected db: Database;

  constructor(window: Electron.BrowserWindow) {
    super(window);
    this.db = new Database();
  }

  async load(): Promise<void> {
    // Single track analysis
    ipcMain.handle(channels.AUDIO_ANALYZE, async (_e, request: AnalyzeRequest): Promise<AudioAnalysisResult | null> => {
      try {
        log.info(`[IPCAudioAnalysis] Analyzing: ${request.filePath}`);
        const workerPool = getWorkerPool(request.poolSize);
        const result = await workerPool.analyzeFile(request.filePath, request.options);

        // AIDEV-NOTE: Save analysis results to database
        if (result) {
          await this.saveAnalysisToDatabase(request.filePath, result);
        }

        return result;
      } catch (error) {
        log.error(`[IPCAudioAnalysis] Analysis failed for ${request.filePath}:`, error);
        return null;
      }
    });

    // Batch analysis with parallel workers and progress reporting
    ipcMain.handle(
      channels.AUDIO_ANALYZE_BATCH,
      async (_e, request: AnalyzeBatchRequest): Promise<BatchAnalysisResult> => {
        const workerPool = getWorkerPool(request.poolSize);
        const poolStatus = workerPool.getStatus();

        log.info(
          `[IPCAudioAnalysis] Batch analyzing ${request.filePaths.length} tracks with ${poolStatus.poolSize} workers`,
        );

        // Progress callback to send events to renderer
        const onProgress = (progress: AnalysisProgressEvent): void => {
          this.window.webContents.send('AUDIO_ANALYSIS_PROGRESS', progress);
        };

        try {
          // Use worker pool for parallel processing
          const resultsMap = await workerPool.analyzeFiles(request.filePaths, request.options, onProgress);

          // Convert Map to objects for IPC serialization
          const results: Record<string, AudioAnalysisResult> = {};
          const errors: Record<string, string> = {};

          // AIDEV-NOTE: Save successful results to database
          const savePromises: Promise<void>[] = [];

          resultsMap.forEach((value, filePath) => {
            if (value instanceof Error) {
              errors[filePath] = value.message;
            } else {
              results[filePath] = value;
              // Save to database asynchronously
              savePromises.push(this.saveAnalysisToDatabase(filePath, value));
            }
          });

          // Wait for all database updates to complete
          await Promise.all(savePromises);

          log.info(
            `[IPCAudioAnalysis] Batch complete: ${Object.keys(results).length} success, ${Object.keys(errors).length} errors`,
          );

          return { results, errors };
        } catch (error) {
          log.error('[IPCAudioAnalysis] Batch analysis failed:', error);
          throw error;
        }
      },
    );

    log.info('[IPCAudioAnalysis] Module loaded');
  }

  /**
   * Save audio analysis results to the database
   * Updates the track with BPM, Key, and Waveform data
   */
  private async saveAnalysisToDatabase(filePath: string, result: AudioAnalysisResult): Promise<void> {
    try {
      // Find track by file path
      const track = await this.db.findTrackByPath(filePath);

      if (!track) {
        log.warn(`[IPCAudioAnalysis] Track not found in database: ${filePath}`);
        return;
      }

      // AIDEV-NOTE: Update track with analysis results
      // Only update fields that have values
      const updatedTrack = { ...track };
      let hasChanges = false;

      if (result.bpm !== undefined && result.bpm > 0) {
        updatedTrack.bpm = Math.round(result.bpm); // Round to integer
        hasChanges = true;
        log.info(`[IPCAudioAnalysis] Updated BPM: ${track.title} -> ${updatedTrack.bpm}`);
      }

      if (result.key && result.scale) {
        // Format key as "C major" or "Am minor"
        const keyString = result.scale === 'minor' ? `${result.key}m` : result.key;
        updatedTrack.initialKey = keyString;
        hasChanges = true;
        log.info(`[IPCAudioAnalysis] Updated Key: ${track.title} -> ${updatedTrack.initialKey}`);
      }

      if (result.waveformPeaks && result.waveformPeaks.length > 0) {
        updatedTrack.waveformPeaks = result.waveformPeaks;
        hasChanges = true;
        log.info(`[IPCAudioAnalysis] Updated Waveform: ${track.title} -> ${result.waveformPeaks.length} peaks`);
      }

      // Save to database if there are changes
      if (hasChanges) {
        await this.db.updateTrack(updatedTrack);
        log.info(`[IPCAudioAnalysis] Saved to database: ${track.title}`);

        // AIDEV-NOTE: Send track complete event to renderer for real-time UI updates
        // This allows the TrackList to update each row as analysis completes
        this.window.webContents.send(channels.AUDIO_ANALYSIS_TRACK_COMPLETE, updatedTrack);
      } else {
        log.warn(`[IPCAudioAnalysis] No valid data to save for: ${track.title}`);
      }
    } catch (error) {
      log.error(`[IPCAudioAnalysis] Failed to save to database: ${filePath}`, error);
    }
  }
}
