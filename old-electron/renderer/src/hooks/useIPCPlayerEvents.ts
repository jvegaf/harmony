import { useEffect } from 'react';

import { usePlayerAPI } from '../stores/usePlayerStore';
import useCurrentViewTracks from './useCurrentViewTracks';
import player from '../lib/player';
import channels from '../../../preload/lib/ipc-channels';

const { ipcRenderer } = window.ElectronAPI;

/**
 * Handle IPC player events from main process (global media keys, app menu)
 */
export function useIPCPlayerEvents() {
  const playerAPI = usePlayerAPI();
  const tracks = useCurrentViewTracks();

  useEffect(() => {
    function play() {
      if (player.getTrack()) {
        playerAPI.play();
      }
    }

    function onPlay() {
      const track = player.getTrack();

      if (!track) throw new Error('Track is undefined');

      ipcRenderer.send(channels.PLAYBACK_PLAY, track ?? null);
      ipcRenderer.send(channels.PLAYBACK_TRACK_CHANGE, track);
    }

    function onPause() {
      ipcRenderer.send(channels.PLAYBACK_PAUSE);
    }

    ipcRenderer.on(channels.PLAYBACK_PLAY, play);
    ipcRenderer.on(channels.PLAYBACK_PAUSE, playerAPI.pause);
    ipcRenderer.on(channels.PLAYBACK_PLAYPAUSE, playerAPI.togglePlayPause);
    ipcRenderer.on(channels.PLAYBACK_PREVIOUS, playerAPI.previous);
    ipcRenderer.on(channels.PLAYBACK_NEXT, playerAPI.next);
    ipcRenderer.on(channels.PLAYBACK_STOP, playerAPI.stop);

    player.getAudio().addEventListener('play', onPlay);
    player.getAudio().addEventListener('pause', onPause);

    return function cleanup() {
      ipcRenderer.removeAllListeners(channels.PLAYBACK_PLAY);
      ipcRenderer.removeAllListeners(channels.PLAYBACK_PAUSE);
      ipcRenderer.removeAllListeners(channels.PLAYBACK_PLAYPAUSE);
      ipcRenderer.removeAllListeners(channels.PLAYBACK_PREVIOUS);
      ipcRenderer.removeAllListeners(channels.PLAYBACK_NEXT);
      ipcRenderer.removeAllListeners(channels.PLAYBACK_STOP);

      player.getAudio().removeEventListener('play', onPlay);
      player.getAudio().removeEventListener('pause', onPause);
    };
  }, [playerAPI, tracks]);
}
