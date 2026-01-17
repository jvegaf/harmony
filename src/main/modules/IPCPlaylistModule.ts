import fs from 'fs';
import path from 'path';

import { BrowserWindow, dialog, ipcMain, IpcMainEvent } from 'electron';
import log from 'electron-log';

import channels from '../../preload/lib/ipc-channels';

import ModuleWindow from './BaseWindowModule';

/**
 * Module in charge of playlist import/export operations
 * AIDEV-NOTE: Handles M3U playlist format for import/export functionality
 */
class IPCPlaylistModule extends ModuleWindow {
  constructor(window: BrowserWindow) {
    super(window);
  }

  async load(): Promise<void> {
    // Handle playlist export to M3U format
    ipcMain.on(channels.PLAYLIST_EXPORT, this.exportPlaylistToM3U.bind(this));

    // Handle M3U file resolution (import)
    ipcMain.handle(channels.PLAYLISTS_RESOLVE_M3U, this.resolveM3UPlaylist.bind(this));
  }

  // ---------------------------------------------------------------------------
  // IPC Events
  // ---------------------------------------------------------------------------

  /**
   * Export a playlist to M3U format
   * AIDEV-NOTE: Creates an extended M3U file with track metadata
   */
  private async exportPlaylistToM3U(_event: IpcMainEvent, playlistName: string, trackPaths: string[]): Promise<void> {
    try {
      log.info(`Exporting playlist "${playlistName}" to M3U format`);

      // Show save dialog
      const result = await dialog.showSaveDialog(this.window, {
        title: 'Export Playlist',
        defaultPath: `${playlistName}.m3u`,
        filters: [
          { name: 'M3U Playlist', extensions: ['m3u'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        log.info('Playlist export cancelled by user');
        return;
      }

      // Generate M3U content
      const m3uContent = this.generateM3UContent(trackPaths);

      // Write to file
      await fs.promises.writeFile(result.filePath, m3uContent, 'utf-8');

      log.info(`Playlist exported successfully to: ${result.filePath}`);
    } catch (err) {
      log.error('Error exporting playlist to M3U:', err);
      throw err;
    }
  }

  /**
   * Parse and resolve tracks from an M3U playlist file
   * AIDEV-NOTE: Returns array of absolute track paths found in the M3U file
   */
  private async resolveM3UPlaylist(_event: Electron.IpcMainInvokeEvent, m3uPath: string): Promise<string[]> {
    try {
      log.info(`Resolving M3U playlist: ${m3uPath}`);

      const content = await fs.promises.readFile(m3uPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      const playlistDir = path.dirname(m3uPath);
      const trackPaths: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        // Resolve path (handle both absolute and relative paths)
        let trackPath = trimmedLine;
        if (!path.isAbsolute(trackPath)) {
          trackPath = path.resolve(playlistDir, trackPath);
        }

        // Check if file exists
        try {
          await fs.promises.access(trackPath, fs.constants.F_OK);
          trackPaths.push(trackPath);
        } catch {
          log.warn(`Track file not found: ${trackPath}`);
        }
      }

      log.info(`Resolved ${trackPaths.length} tracks from M3U playlist`);
      return trackPaths;
    } catch (err) {
      log.error('Error resolving M3U playlist:', err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate M3U file content from track paths
   * AIDEV-NOTE: Uses extended M3U format (#EXTM3U) for better compatibility
   */
  private generateM3UContent(trackPaths: string[]): string {
    const lines: string[] = ['#EXTM3U', ''];

    for (const trackPath of trackPaths) {
      // Add track path (use absolute paths for better compatibility)
      lines.push(trackPath);
    }

    return lines.join('\n');
  }
}

export default IPCPlaylistModule;
