import { useEffect } from 'react';

import player from '../../lib/player';
import channels from '../../../../preload/lib/ipc-channels';
import PlaylistsAPI from '../../stores/PlaylistsAPI';
import { CommandPayload, Track } from '../../../../preload/types/emusik';
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

    function fixTags(selected: Track[]) {
      libraryAPI.toFix(selected.length);
      selected.forEach(track => {
        libraryAPI.fixTrack(track.id);
      });
    }

    ipcRenderer.on(channels.CMD_PLAYLIST_NEW, (_, selected) => playlistNew(selected));
    ipcRenderer.on(channels.CMD_TRACKS_PLAYLIST_ADD, (_, payload) => addTracksToPlaylist(payload));
    ipcRenderer.on(channels.CMD_TRACKS_PLAYLIST_REMOVE, (_, payload) => removeTracksToPlaylist(payload));
    ipcRenderer.on(channels.CMD_TRACK_ARTIST_FIND, (_, artist) => artistFind(artist));
    ipcRenderer.on(channels.CMD_FIX_TAGS, (_, selected) => fixTags(selected));

    return function cleanup() {
      ipcRenderer.removeAllListeners(channels.CMD_PLAYLIST_NEW);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_PLAYLIST_ADD);
      ipcRenderer.removeAllListeners(channels.CMD_TRACKS_PLAYLIST_REMOVE);
      ipcRenderer.removeAllListeners(channels.CMD_TRACK_ARTIST_FIND);
      ipcRenderer.removeAllListeners(channels.CMD_FIX_TAGS);
    };
  }, [libraryAPI]);

  return null;
}

export default IPCMenuEvents;
