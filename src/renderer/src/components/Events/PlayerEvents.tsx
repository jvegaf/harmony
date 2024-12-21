import { useEffect } from 'react';

import { usePlayerAPI } from '../../stores/usePlayerStore';
import { useLibraryAPI } from '../../stores/useLibraryStore';
import player from '../../lib/player';

const AUDIO_ERRORS = {
  aborted: 'The video playback was aborted.',
  corrupt: 'The audio playback was aborted due to a corruption problem.',
  notFound: 'The track file could not be found. It may be due to a file move or an unmounted partition.',
  unknown: 'An unknown error occurred.',
};

/**
 * Handle app-level IPC Events init and cleanup
 */
function PlayerEvents() {
  const playerAPI = usePlayerAPI();
  const libraryAPI = useLibraryAPI();
  const { logger } = window.Main;

  // // If no queue is provided, we create it based on the screen the user is on
  // if (!newQueue) {
  //   if (hash.startsWith('#/playlists')) {
  //     newQueue = library.tracks.playlist;
  //     newQueue = [];
  //   } else {
  //     // we are either on the library or the settings view
  //     // so let's play the whole library
  //     // Because the tracks in the store are not ordered, let's filter
  //     // and sort everything
  //     const { sort, search } = library;
  //     newQueue = library.tracks;

  //     newQueue = sortTracks(filterTracks(newQueue, search), SORT_ORDERS[sort.by][sort.order]);
  //   }
  // }

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
    // Audio Events
    player.getAudio().addEventListener('ended', playerAPI.next);
    player.getAudio().addEventListener('error', handleAudioError);

    return function cleanup() {
      player.getAudio().removeEventListener('ended', playerAPI.next);
      player.getAudio().removeEventListener('error', handleAudioError);
    };
  }, [libraryAPI, playerAPI]);

  return null;
}

export default PlayerEvents;
