import { useEffect, useRef } from 'react';

import { usePlaylistsAPI } from '../stores/usePlaylistsStore';
import { Track } from '@/types/harmony';
import useTaggerStore, { useTaggerAPI } from '../stores/useTaggerStore';
import { useLibraryAPI } from '../stores/useLibraryStore';
import useLibraryUIStore from '../stores/useLibraryUIStore';
import { notifications } from '@mantine/notifications';
import { listen } from '@tauri-apps/api/event';
import { audioAnalysis } from '@/lib/tauri-api';

/**
 * Handle menu events from Tauri backend (context menus, app menu commands)
 * AIDEV-NOTE: Phase 5 - Menu system not yet fully implemented in Tauri backend
 * This hook listens for Tauri custom events instead of Electron IPC
 */
export function useIPCMenuEvents() {
  const libraryAPI = useLibraryAPI();
  const playlistsAPI = usePlaylistsAPI();
  const taggerAPI = useTaggerAPI();
  const uiAPI = useLibraryUIStore(state => state.api);
  // Use refs to store unsubscribe functions for audio analysis listeners
  // This allows cleanup when analysis completes or component unmounts
  const analysisUnsubscribesRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    async function playlistNew(selected: Track[]) {
      await playlistsAPI.create('New playlist', selected);
    }

    async function addTracksToPlaylist(payload: { playlistId: string; selected: Track[] }) {
      const { playlistId, selected } = payload;
      await playlistsAPI.addTracks(playlistId, selected);
    }

    async function removeTracksToPlaylist(payload: { playlistId: string; selected: Track[] }) {
      const { playlistId, selected } = payload;
      await playlistsAPI.removeTracks(playlistId, selected);
    }

    function artistFind(artist: string) {
      libraryAPI.search(artist);
    }

    function filenameToTags(selected: Track[]) {
      taggerAPI.filenameToTags(selected);
    }

    function findCandidates(selected: Track[]) {
      taggerAPI.findCandidates(selected);
    }

    function analyzeAudio(selected: Track[]) {
      const notificationId = `audio-analysis-${Date.now()}`;

      notifications.show({
        id: notificationId,
        title: 'Audio Analysis',
        message: `Analyzing ${selected.length} track(s)...`,
        loading: true,
        autoClose: false,
      });

      // Listen to progress events and update notification
      const unsubscribeProgress = audioAnalysis.onProgress(progress => {
        const { completed, total, percentage } = progress;
        notifications.update({
          id: notificationId,
          title: 'Audio Analysis',
          message: `Analyzing... ${completed}/${total} (${percentage.toFixed(0)}%)`,
          loading: true,
          autoClose: false,
        });
      });

      // Listen for track completion events to update TrackList in real-time
      // This triggers the store's `updated` state which AG Grid watches for row updates
      const unsubscribeTrackComplete = audioAnalysis.onTrackComplete(track => {
        useTaggerStore.setState({ updated: track });
      });

      // Store unsubscribe functions for cleanup
      analysisUnsubscribesRef.current = [unsubscribeProgress, unsubscribeTrackComplete];

      const filePaths = selected.map(track => track.path);

      // Fire-and-forget pattern - don't await the batch analysis
      // This prevents UI blocking while analysis runs in the background
      audioAnalysis
        .analyzeBatch(filePaths)
        .then(() => {
          // Cleanup listeners
          for (const unsub of analysisUnsubscribesRef.current) {
            unsub();
          }
          analysisUnsubscribesRef.current = [];

          notifications.update({
            id: notificationId,
            title: 'Audio Analysis Complete',
            message: `Successfully analyzed ${selected.length} track(s)`,
            loading: false,
            autoClose: 3000,
            color: 'green',
          });
        })
        .catch(error => {
          // Cleanup listeners
          for (const unsub of analysisUnsubscribesRef.current) {
            unsub();
          }
          analysisUnsubscribesRef.current = [];

          notifications.update({
            id: notificationId,
            title: 'Audio Analysis Failed',
            message: String(error),
            loading: false,
            autoClose: 5000,
            color: 'red',
          });
        });
    }

    function deleteTracks(selected: Track[]) {
      libraryAPI.deleteTracks(selected);
    }

    function renamePlaylist(playlistId: string) {
      uiAPI.setRenamingPlaylist(playlistId);
    }

    async function duplicatePlaylist(playlistId: string) {
      await playlistsAPI.duplicate(playlistId);
    }

    async function removePlaylist(playlistId: string) {
      await playlistsAPI.remove(playlistId);
    }

    async function exportPlaylist(playlistId: string) {
      await playlistsAPI.exportToM3u(playlistId);
    }

    // AIDEV-NOTE: Tauri event listeners (Phase 5 - Menu events need backend implementation)
    // When menu system is implemented, emit these events from Rust with:
    // app.emit("cmd:playlist:new", payload)
    listen('cmd:playlist:new', event => playlistNew(event.payload as Track[])).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:tracks:playlist:add', event => addTracksToPlaylist(event.payload as any)).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:tracks:playlist:remove', event => removeTracksToPlaylist(event.payload as any)).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:track:artist:find', event => artistFind(event.payload as string)).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:filename:tags', event => filenameToTags(event.payload as Track[])).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:find:candidates', event => findCandidates(event.payload as Track[])).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:analyze:audio', event => analyzeAudio(event.payload as Track[])).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:tracks:delete', event => deleteTracks(event.payload as Track[])).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:playlist:rename', event => renamePlaylist(event.payload as string)).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:playlist:duplicate', event => duplicatePlaylist(event.payload as string)).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:playlist:export', event => exportPlaylist(event.payload as string)).then(unlisten =>
      unlisteners.push(unlisten),
    );
    listen('cmd:playlist:remove', event => removePlaylist(event.payload as string)).then(unlisten =>
      unlisteners.push(unlisten),
    );

    return function cleanup() {
      // Cleanup all event listeners
      for (const unlisten of unlisteners) {
        unlisten();
      }

      // Cleanup any active audio analysis listeners on unmount
      for (const unsub of analysisUnsubscribesRef.current) {
        unsub();
      }
      analysisUnsubscribesRef.current = [];
    };
  }, [libraryAPI, playlistsAPI, taggerAPI, uiAPI]);
}
