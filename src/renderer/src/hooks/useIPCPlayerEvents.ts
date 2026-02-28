import { useEffect } from 'react';

import { usePlayerAPI } from '../stores/usePlayerStore';
import player from '../lib/player';
import { listen, emit } from '@tauri-apps/api/event';

/**
 * Handle player events from Tauri backend (global media keys, app menu)
 * AIDEV-NOTE: Phase 5 - Media key handling needs implementation in Rust
 */
export function useIPCPlayerEvents() {
  const playerAPI = usePlayerAPI();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    function play() {
      if (player.getTrack()) {
        playerAPI.play();
      }
    }

    function onPlay() {
      const track = player.getTrack();

      if (!track) throw new Error('Track is undefined');

      // Emit events to backend (for media keys, Discord RPC, etc.)
      emit('playback:play', track ?? null);
      emit('playback:track-change', track);
    }

    function onPause() {
      emit('playback:pause', null);
    }

    // Listen for playback control events from backend
    listen('playback:play', () => play()).then(unlisten => unlisteners.push(unlisten));
    listen('playback:pause', () => playerAPI.pause()).then(unlisten => unlisteners.push(unlisten));
    listen('playback:playpause', () => playerAPI.togglePlayPause()).then(unlisten => unlisteners.push(unlisten));
    listen('playback:previous', () => playerAPI.previous()).then(unlisten => unlisteners.push(unlisten));
    listen('playback:next', () => playerAPI.next()).then(unlisten => unlisteners.push(unlisten));
    listen('playback:stop', () => playerAPI.stop()).then(unlisten => unlisteners.push(unlisten));

    // Listen to audio element events and emit to backend
    player.getAudio().addEventListener('play', onPlay);
    player.getAudio().addEventListener('pause', onPause);

    return function cleanup() {
      for (const unlisten of unlisteners) {
        unlisten();
      }

      player.getAudio().removeEventListener('play', onPlay);
      player.getAudio().removeEventListener('pause', onPause);
    };
  }, [playerAPI]);
}
