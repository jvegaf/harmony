import { useEffect, useRef } from 'react';

import channels from '../../../../preload/lib/ipc-channels';
import PlaylistsAPI from '../../stores/PlaylistsAPI';
import { CommandPayload, Track } from '../../../../preload/types/harmony';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { notifications } from '@mantine/notifications';

const { ipcRenderer } = window.ElectronAPI;

/**
 * Handle app-level IPC Events init and cleanup
 */
function IPCMenuEvents() {
  const libraryAPI = useLibraryAPI();
  // AIDEV-NOTE: Use refs to store unsubscribe functions for audio analysis listeners
  // This allows cleanup when analysis completes or component unmounts
  const analysisUnsubscribesRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    async function playlistNew(selected: Track[]) {
      await PlaylistsAPI.create('New playlist', selected);
    }

    async function addTracksToPlaylist(payload: CommandPayload) {
      const { playlistId, selected } = payload;
      await PlaylistsAPI.addTracks(playlistId, selected);
    }

    async function removeTracksToPlaylist(payload: CommandPayload) {
      const { playlistId, selected } = payload;
      await PlaylistsAPI.removeTracks(playlistId, selected);
    }

    function artistFind(artist: string) {
      libraryAPI.search(artist);
    }

    function filenameToTags(selected: Track[]) {
      libraryAPI.filenameToTags(selected);
    }

    function findCandidates(selected: Track[]) {
      libraryAPI.findCandidates(selected);
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

      // AIDEV-NOTE: Listen to progress events and update notification
      const unsubscribeProgress = window.Main.audioAnalysis.onProgress(progress => {
        const { completed, total, percentage } = progress;
        notifications.update({
          id: notificationId,
          title: 'Audio Analysis',
          message: `Analyzing... ${completed}/${total} (${percentage.toFixed(0)}%)`,
          loading: true,
          autoClose: false,
        });
      });

      // AIDEV-NOTE: Listen for track completion events to update TrackList in real-time
      // This triggers the store's `updated` state which AG Grid watches for row updates
      const unsubscribeTrackComplete = window.Main.audioAnalysis.onTrackComplete(track => {
        useLibraryStore.setState({ updated: track });
      });

      // Store unsubscribe functions for cleanup
      analysisUnsubscribesRef.current = [unsubscribeProgress, unsubscribeTrackComplete];

      const filePaths = selected.map(track => track.path);

      // AIDEV-NOTE: Fire-and-forget pattern - don't await the batch analysis
      // This prevents UI blocking while analysis runs in the background
      window.Main.audioAnalysis
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
      libraryAPI.setRenamingPlaylist(playlistId);
    }

    async function duplicatePlaylist(playlistId: string) {
      await PlaylistsAPI.duplicate(playlistId);
    }

    async function removePlaylist(playlistId: string) {
      await PlaylistsAPI.remove(playlistId);
    }

    async function exportPlaylist(playlistId: string) {
      await PlaylistsAPI.exportToM3u(playlistId);
    }

    ipcRenderer.on(channels.CMD_PLAYLIST_NEW, (_, selected) => playlistNew(selected));
    ipcRenderer.on(channels.CMD_TRACKS_PLAYLIST_ADD, (_, payload) => addTracksToPlaylist(payload));
    ipcRenderer.on(channels.CMD_TRACKS_PLAYLIST_REMOVE, (_, payload) => removeTracksToPlaylist(payload));
    ipcRenderer.on(channels.CMD_TRACK_ARTIST_FIND, (_, artist) => artistFind(artist));
    ipcRenderer.on(channels.CMD_FILENAME_TAGS, (_, selected) => filenameToTags(selected));
    ipcRenderer.on(channels.CMD_FIND_CANDIDATES, (_, selected) => findCandidates(selected));
    ipcRenderer.on(channels.CMD_ANALYZE_AUDIO, (_, selected) => analyzeAudio(selected));
    ipcRenderer.on(channels.CMD_TRACKS_DELETE, (_, selected) => deleteTracks(selected));
    ipcRenderer.on(channels.CMD_PLAYLIST_RENAME, (_, playlistId) => renamePlaylist(playlistId));
    ipcRenderer.on(channels.CMD_PLAYLIST_DUPLICATE, (_, playlistId) => duplicatePlaylist(playlistId));
    ipcRenderer.on(channels.CMD_PLAYLIST_EXPORT, (_, playlistId) => exportPlaylist(playlistId));
    ipcRenderer.on(channels.CMD_PLAYLIST_REMOVE, (_, playlistId) => removePlaylist(playlistId));

    return function cleanup() {
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_NEW);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_PLAYLIST_ADD);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_PLAYLIST_REMOVE);
      ipcRenderer.removeAllListeners(channels.CMD_TRACK_ARTIST_FIND);
      ipcRenderer.removeAllListeners(channels.CMD_FILENAME_TAGS);
      ipcRenderer.removeAllListeners(channels.CMD_FIND_CANDIDATES);
      ipcRenderer.removeAllListeners(channels.CMD_ANALYZE_AUDIO);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_DELETE);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_RENAME);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_DUPLICATE);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_EXPORT);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_REMOVE);

      // AIDEV-NOTE: Cleanup any active audio analysis listeners on unmount
      for (const unsub of analysisUnsubscribesRef.current) {
        unsub();
      }
      analysisUnsubscribesRef.current = [];
    };
  }, [libraryAPI]);

  return null;
}

export default IPCMenuEvents;
