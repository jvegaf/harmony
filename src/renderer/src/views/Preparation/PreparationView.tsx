import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useRouteLoaderData } from 'react-router-dom';
import Keybinding from 'react-keybinding-component';

import { Playlist, Track } from '../../../../preload/types/harmony';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import usePlayerStore from '../../stores/usePlayerStore';
import { RootLoaderData } from '../Root';
import styles from './PreparationView.module.css';

const { db } = window.Main;

export default function PreparationView() {
  const navigate = useNavigate();
  const playerAPI = usePlayerAPI();
  const { playingTrack, queue, queueCursor } = usePlayerStore();

  const { tracks } = useRouteLoaderData('root') as RootLoaderData;

  const [preparationPlaylist, setPreparationPlaylist] = useState<Playlist | null>(null);
  const [pressedK, setPressedK] = useState(false);
  const [pressedD, setPressedD] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

  // AIDEV-NOTE: Load Preparation playlist on mount
  useEffect(() => {
    const loadPreparationPlaylist = async () => {
      try {
        const playlist = await db.playlists.getPreparationPlaylist();
        setPreparationPlaylist(playlist);
      } catch (error) {
        console.error('Failed to load Preparation playlist:', error);
      }
    };

    loadPreparationPlaylist();
  }, []);

  useEffect(() => {
    const startPreparationMode = async () => {
      if (tracks.length === 0) {
        return;
      }

      // Enable Prune Mode in player store (reuses same 50% start feature)
      playerAPI.setPruneMode(true);

      // Start playing from the beginning
      const trackIds = tracks.map((t: Track) => t.id);
      await playerAPI.start(trackIds, 0);
    };

    startPreparationMode();

    // Cleanup: Disable Prune Mode when leaving
    return () => {
      playerAPI.setPruneMode(false);
    };
    // Intentionally run only once on mount
  }, []);

  // AIDEV-NOTE: Check if we're at the end of the queue
  useEffect(() => {
    setIsAtEnd(queueCursor === queue.length - 1);
  }, [queueCursor, queue.length]);

  // AIDEV-NOTE: Reload playlist count when track is added to preparation
  const reloadPreparationCount = useCallback(async () => {
    try {
      const playlist = await db.playlists.getPreparationPlaylist();
      setPreparationPlaylist(playlist);
    } catch (error) {
      console.error('Failed to reload Preparation playlist:', error);
    }
  }, []);

  // AIDEV-NOTE: Handle K key - Keep for set and advance
  const handleKeep = useCallback(async () => {
    if (!playingTrack || isAtEnd) {
      return;
    }

    try {
      // Add track to Preparation playlist
      await db.playlists.addTrackToPreparation(playingTrack.id);
      await reloadPreparationCount();

      // Visual feedback
      setPressedK(true);
      setTimeout(() => setPressedK(false), 300);

      // Advance to next track
      if (!isAtEnd) {
        playerAPI.next();
      }
    } catch (error) {
      console.error('Failed to add track to preparation:', error);
    }
  }, [playingTrack, isAtEnd, reloadPreparationCount, playerAPI]);

  // AIDEV-NOTE: Handle D key - Skip and advance
  const handleSkip = useCallback(async () => {
    if (isAtEnd) {
      return;
    }

    // Visual feedback
    setPressedD(true);
    setTimeout(() => setPressedD(false), 300);

    // Advance to next track
    if (!isAtEnd) {
      playerAPI.next();
    }
  }, [isAtEnd, playerAPI]);

  // AIDEV-NOTE: Handle Q key - Quit preparation mode
  const handleQuit = useCallback(async () => {
    const tracksCount = preparationPlaylist?.tracks?.length ?? 0;

    if (tracksCount === 0) {
      // No tracks selected, go back to library
      navigate('/');
    } else {
      // Navigate to Preparation playlist
      navigate(`/playlists/__PREPARATION__`);
    }
  }, [preparationPlaylist, navigate]);

  // AIDEV-NOTE: Keyboard event handler
  const onKey = useCallback(
    async (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          e.stopPropagation();
          await handleKeep();
          break;
        case 'd':
          e.preventDefault();
          e.stopPropagation();
          await handleSkip();
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
    [handleKeep, handleSkip, handleQuit],
  );

  // AIDEV-NOTE: Handle empty library
  if (tracks.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.preparationOverlay}>
          <h2>Preparation Mode</h2>
          <p className={styles.subtitle}>No tracks available for preparation</p>
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

  // AIDEV-NOTE: Show end message when reaching end of queue
  if (isAtEnd && queueCursor >= 0) {
    return (
      <div className={styles.container}>
        <div className={styles.preparationOverlay}>
          <h2>Preparation Mode Complete</h2>
          <p className={styles.subtitle}>You&apos;ve reached the end of the track list</p>
          <div className={styles.forPreparation}>
            <p>{preparationPlaylist?.tracks?.length ?? 0} tracks selected for your set</p>
          </div>
          <div className={styles.footer}>
            <button
              type='button'
              onClick={handleQuit}
              className={styles.quitButton}
            >
              {(preparationPlaylist?.tracks?.length ?? 0) > 0 ? 'View Set Preparation Playlist' : 'Back to Library'}
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
      <div className={styles.preparationOverlay}>
        <h2>Preparation Mode</h2>
        <p className={styles.subtitle}>Listen to tracks and select the ones you want for your set</p>

        <div className={styles.trackInfo}>
          <h3>{playingTrack?.title ?? 'No track'}</h3>
          <h4>{playingTrack?.artist ?? 'Unknown artist'}</h4>
          <small>{playingTrack?.album ?? ''}</small>
        </div>

        <div className={styles.shortcuts}>
          <div className={`${styles.shortcut} ${styles.keep} ${pressedK ? styles.pressed : ''}`}>
            <p>Press</p>
            <div className={styles.keys}>
              <h1>K</h1>
            </div>
            <p>to keep</p>
          </div>
          <div className={`${styles.shortcut} ${styles.skip} ${pressedD ? styles.pressed : ''}`}>
            <p>Press</p>
            <div className={styles.keys}>
              <h1>D</h1>
            </div>
            <p>to skip</p>
          </div>
        </div>

        <div className={styles.forPreparation}>
          <p>{preparationPlaylist?.tracks?.length ?? 0} tracks selected for your set</p>
        </div>

        <div className={styles.footer}>
          <p>Press Q to finish preparation</p>
          <small>Selected tracks will be in the Set Preparation playlist</small>
        </div>
      </div>

      <Keybinding
        onKey={onKey}
        preventInputConflict
      />
    </div>
  );
}

// AIDEV-NOTE: Loader for preloading data (not strictly necessary but follows pattern)
PreparationView.loader = async () => {
  return {};
};
