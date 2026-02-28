import { useEffect } from 'react';

import { usePlayerAPI } from '../stores/usePlayerStore';
import player from '../lib/player';
import { logger } from '@/lib/tauri-api';

const AUDIO_ERRORS = {
  aborted: 'The video playback was aborted.',
  corrupt: 'The audio playback was aborted due to a corruption problem.',
  notFound: 'The track file could not be found. It may be due to a file move or an unmounted partition.',
  unknown: 'An unknown error occurred.',
};

/**
 * Handle player-level events: audio errors and playback completion
 */
export function usePlayerEvents() {
  const playerAPI = usePlayerAPI();

  useEffect(() => {
    function handleAudioError(e: ErrorEvent) {
      playerAPI.stop();

      const element = e.target as HTMLAudioElement;

      if (element) {
        const { error } = element;

        if (!error) return;

        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            logger.warn(AUDIO_ERRORS.aborted);
            break;
          case error.MEDIA_ERR_DECODE:
            logger.error(AUDIO_ERRORS.corrupt);
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            logger.error(AUDIO_ERRORS.notFound);
            break;
          default:
            logger.error(AUDIO_ERRORS.unknown);
            break;
        }
      }
    }

    // Bind player events
    player.getAudio().addEventListener('ended', playerAPI.next);
    player.getAudio().addEventListener('error', handleAudioError);

    return function cleanup() {
      player.getAudio().removeEventListener('ended', playerAPI.next);
      player.getAudio().removeEventListener('error', handleAudioError);
    };
  }, [playerAPI]);
}
