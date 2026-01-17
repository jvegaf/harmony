import { useEffect } from 'react';

import channels from '../../../../preload/lib/ipc-channels';
import PlaylistsAPI from '../../stores/PlaylistsAPI';
import { CommandPayload, Track } from '../../../../preload/types/harmony';
import { useLibraryAPI } from '../../stores/useLibraryStore';

const { ipcRenderer } = window.ElectronAPI;

/**
 * Handle app-level IPC Events init and cleanup
 */
function IPCMenuEvents() {
  const libraryAPI = useLibraryAPI();

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

    ipcRenderer.on(channels.CMD_PLAYLIST_NEW, (_, selected) => playlistNew(selected));
    ipcRenderer.on(channels.CMD_TRACKS_PLAYLIST_ADD, (_, payload) => addTracksToPlaylist(payload));
    ipcRenderer.on(channels.CMD_TRACKS_PLAYLIST_REMOVE, (_, payload) => removeTracksToPlaylist(payload));
    ipcRenderer.on(channels.CMD_TRACK_ARTIST_FIND, (_, artist) => artistFind(artist));
    ipcRenderer.on(channels.CMD_FILENAME_TAGS, (_, selected) => filenameToTags(selected));
    ipcRenderer.on(channels.CMD_FIND_CANDIDATES, (_, selected) => findCandidates(selected));
    ipcRenderer.on(channels.CMD_TRACKS_DELETE, (_, selected) => deleteTracks(selected));
    ipcRenderer.on(channels.CMD_PLAYLIST_RENAME, (_, playlistId) => renamePlaylist(playlistId));
    ipcRenderer.on(channels.CMD_PLAYLIST_DUPLICATE, (_, playlistId) => duplicatePlaylist(playlistId));
    ipcRenderer.on(channels.CMD_PLAYLIST_REMOVE, (_, playlistId) => removePlaylist(playlistId));

    return function cleanup() {
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_NEW);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_PLAYLIST_ADD);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_PLAYLIST_REMOVE);
      ipcRenderer.removeAllListeners(channels.CMD_TRACK_ARTIST_FIND);
      ipcRenderer.removeAllListeners(channels.CMD_FILENAME_TAGS);
      ipcRenderer.removeAllListeners(channels.CMD_FIND_CANDIDATES);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_DELETE);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_RENAME);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_DUPLICATE);
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_REMOVE);
    };
  }, [libraryAPI]);

  return null;
}

export default IPCMenuEvents;
