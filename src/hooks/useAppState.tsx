/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react';
import { Track } from '../../electron/types/emusik';
import logger from '../../electron/services/logger';
import { LibraryContext } from '../context/LibraryContext';
import { LibraryContextType } from '../@types/library';
import AudioPlayer from '../lib/audioplayer';

export default function useAppState() {
  const { tracksCollection, addTracks, updateTrack } = React.useContext(LibraryContext) as LibraryContextType;
  const player = new AudioPlayer();

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;
    logger.info('new tracks:', newTracks.length);

    addTracks(newTracks);
  }, [addTracks]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      logger.info('track update', track);

      window.Main.PersistTrack(track);
      updateTrack(track);
    },
    [updateTrack]
  );

  const tracksFixedHandler = React.useCallback(
    (fixedTracks: Track[]) => {
      fixedTracks.forEach((t) => updateTrack(t));
    },
    [updateTrack]
  );

  const showCtxMenu = React.useCallback(
    (selected: Track[]) => {
      logger.info('selected in hook:', selected);
      window.Main.ShowContextMenu(selected);
    },
    [window]
  );

  const onFixAllTracks = React.useCallback(() => window.Main.FixTracks(tracksCollection), [tracksCollection]);

  const playTrack = React.useCallback(
    (t: Track) => {
      logger.info('track to play:', t);
      player.playTrack(t);
    },
    [player]
  );

  const togglePlayPause = React.useCallback(() => {
    if (player.isPaused()) {
      player.play();
    }
    player.pause();
  }, [player]);

  return {
    tracksFixedHandler,
    player,
    playTrack,
    togglePlayPause,
    onFixAllTracks,
    saveChanges,
    onOpenFolder,
    showCtxMenu
  };
}
