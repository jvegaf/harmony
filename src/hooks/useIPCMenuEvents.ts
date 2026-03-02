import { useEffect } from 'react';

import { usePlaylistsAPI } from '../stores/usePlaylistsStore';
import { Track } from '@/types/harmony';
import { useTaggerAPI } from '../stores/useTaggerStore';
import { useLibraryAPI } from '../stores/useLibraryStore';
import useLibraryUIStore from '../stores/useLibraryUIStore';
import { listen } from '@tauri-apps/api/event';
import { analyzeAudioTracks } from '@/lib/audio-analysis-helper';

/**
 * Handle menu events from Tauri backend (context menus, app menu commands)
 * AIDEV-NOTE: Phase 5 - Context menus now implemented in React components (TrackContextMenu, PlaylistContextMenu)
 * This hook remains for potential future backend-triggered menu commands via Tauri events
 * Most menu actions are now called directly from context menu components
 */
export function useIPCMenuEvents() {
  const libraryAPI = useLibraryAPI();
  const playlistsAPI = usePlaylistsAPI();
  const taggerAPI = useTaggerAPI();
  const uiAPI = useLibraryUIStore(state => state.api);

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
      analyzeAudioTracks(selected);
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
    };
  }, [libraryAPI, playlistsAPI, taggerAPI, uiAPI]);
}
