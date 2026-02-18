import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useRouteLoaderData } from 'react-router-dom';
import Keybinding from 'react-keybinding-component';

import { Playlist, Track } from '../../../../preload/types/harmony';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import usePlayerStore from '../../stores/usePlayerStore';
import { RootLoaderData } from '../Root';
import styles from './PruneView.module.css';

const { db } = window.Main;

export default function PruneView() {
  const navigate = useNavigate();
  const playerAPI = usePlayerAPI();
  const { playingTrack, queue, queueCursor } = usePlayerStore();

  const { tracks } = useRouteLoaderData('root') as RootLoaderData;

  const [toDeletePlaylist, setToDeletePlaylist] = useState<Playlist | null>(null);
  const [pressedK, setPressedK] = useState(false);
  const [pressedD, setPressedD] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // Load To Delete playlist on mount
  useEffect(() => {
    const loadToDeletePlaylist = async () => {
      try {
        const playlist = await db.playlists.getToDeletePlaylist();
        setToDeletePlaylist(playlist);
      } catch (error) {
        console.error('Failed to load To Delete playlist:', error);
      }
    };

    loadToDeletePlaylist();
  }, []);

  useEffect(() => {
    const startPruneMode = async () => {
      // Only start if user has confirmed via "Start Prune Mode" button
      if (!isStarted || tracks.length === 0) {
        return;
      }

      // Enable Prune Mode in player store
      playerAPI.setPruneMode(true);

      // Start playing from the beginning
      const trackIds = tracks.map((t: Track) => t.id);
      await playerAPI.start(trackIds, 0);
    };

    startPruneMode();

    // Cleanup: Disable Prune Mode when leaving
    return () => {
      playerAPI.setPruneMode(false);
    };
    // Run when isStarted changes or on mount
  }, [isStarted, tracks, playerAPI]);

  // Check if we're at the end of the queue
  useEffect(() => {
    setIsAtEnd(queueCursor === queue.length - 1);
  }, [queueCursor, queue.length]);

  // Reload playlist count when track is marked for deletion
  const reloadToDeleteCount = useCallback(async () => {
    try {
      const playlist = await db.playlists.getToDeletePlaylist();
      setToDeletePlaylist(playlist);
    } catch (error) {
      console.error('Failed to reload To Delete playlist:', error);
    }
  }, []);

  // Handle D key - Mark for deletion and advance
  const handleDelete = useCallback(async () => {
    if (!playingTrack || isAtEnd) {
      return;
    }

    try {
      // Add track to To Delete playlist
      await db.playlists.addTrackToToDelete(playingTrack.id);
      await reloadToDeleteCount();

      // Visual feedback
      setPressedD(true);
      setTimeout(() => setPressedD(false), 300);

      // Advance to next track
      if (!isAtEnd) {
        playerAPI.next();
      }
    } catch (error) {
      console.error('Failed to mark track for deletion:', error);
    }
  }, [playingTrack, isAtEnd, reloadToDeleteCount, playerAPI]);

  // Handle K key - Keep and advance
  const handleKeep = useCallback(async () => {
    if (isAtEnd) {
      return;
    }

    // Visual feedback
    setPressedK(true);
    setTimeout(() => setPressedK(false), 300);

    // Advance to next track
    if (!isAtEnd) {
      playerAPI.next();
    }
  }, [isAtEnd, playerAPI]);

  // Handle Q key - Quit prune mode
  const handleQuit = useCallback(async () => {
    const tracksCount = toDeletePlaylist?.tracks?.length ?? 0;

    if (tracksCount === 0) {
      // No tracks marked, go back to library
      navigate('/');
    } else {
      // Navigate to To Delete playlist
      navigate(`/playlists/__TO_DELETE__`);
    }
  }, [toDeletePlaylist, navigate]);

  // Keyboard event handler
  const onKey = useCallback(
    async (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          e.stopPropagation();
          await handleDelete();
          break;
        case 'k':
          e.preventDefault();
          e.stopPropagation();
          await handleKeep();
          break;
        case 'q':
          e.preventDefault();
          e.stopPropagation();
          handleQuit();
          break;
        default:
          break;
      }
    },
    [handleDelete, handleKeep, handleQuit],
  );

  // Handle empty library
  if (tracks.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.pruneOverlay}>
          <h2>Prune Mode</h2>
          <p className={styles.subtitle}>No tracks available to prune</p>
          <div className={styles.footer}>
            <button
              type='button'
              onClick={() => navigate('/')}
              className={styles.quitButton}
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show confirmation screen before starting
  if (!isStarted) {
    return (
      <div className={styles.container}>
        <div className={styles.pruneOverlay}>
          <h2>Prune Mode</h2>
          <p className={styles.subtitle}>Listen to tracks and quickly mark them for deletion</p>

          <div className={styles.trackCount}>
            <p>{tracks.length} tracks in your library</p>
          </div>

          <div className={styles.confirmationButtons}>
            <button
              type='button'
              onClick={() => setIsStarted(true)}
              className={styles.startButton}
            >
              Start Prune Mode
            </button>
            <button
              type='button'
              onClick={() => navigate('/')}
              className={styles.backButton}
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show end message when reaching end of queue
  if (isAtEnd && queueCursor >= 0) {
    return (
      <div className={styles.container}>
        <div className={styles.pruneOverlay}>
          <h2>Prune Mode Complete</h2>
          <p className={styles.subtitle}>You&apos;ve reached the end of the track list</p>
          <div className={styles.forDelete}>
            <p>{toDeletePlaylist?.tracks?.length ?? 0} tracks marked for deletion</p>
          </div>
          <div className={styles.footer}>
            <button
              type='button'
              onClick={handleQuit}
              className={styles.quitButton}
            >
              {(toDeletePlaylist?.tracks?.length ?? 0) > 0 ? 'View To Delete Playlist' : 'Back to Library'}
            </button>
          </div>
        </div>
        <Keybinding
          onKey={onKey}
          preventInputConflict
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pruneOverlay}>
        <h2>Prune Mode</h2>
        <p className={styles.subtitle}>Listen to tracks and quickly mark them for deletion</p>

        <div className={styles.trackInfo}>
          <h3>{playingTrack?.title ?? 'No track'}</h3>
          <h4>{playingTrack?.artist ?? 'Unknown artist'}</h4>
          <small>{playingTrack?.album ?? ''}</small>
        </div>

        <div className={styles.shortcuts}>
          <div className={`${styles.shortcut} ${styles.delete} ${pressedD ? styles.pressed : ''}`}>
            <p>Press</p>
            <div className={styles.keys}>
              <h1>D</h1>
            </div>
            <p>to delete</p>
          </div>
          <div className={`${styles.shortcut} ${styles.keep} ${pressedK ? styles.pressed : ''}`}>
            <p>Press</p>
            <div className={styles.keys}>
              <h1>K</h1>
            </div>
            <p>to keep</p>
          </div>
        </div>

        <div className={styles.forDelete}>
          <p>{toDeletePlaylist?.tracks?.length ?? 0} tracks marked for deletion</p>
        </div>

        <div className={styles.footer}>
          <p>Press Q to finish pruning</p>
          <small>Tracks marked for deletion will be in the To Delete playlist</small>
        </div>
      </div>

      <Keybinding
        onKey={onKey}
        preventInputConflict
      />
    </div>
  );
}

// Loader for preloading data (not strictly necessary but follows pattern)
PruneView.loader = async () => {
  return {};
};
