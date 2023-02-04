/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext } from 'react';
import { Track } from '../../electron/types/emusik';
import { AppContext } from '../context/AppContext';
import logger from '../../electron/services/logger';
import { AppContextType } from '../@types/emusik';

export default function useAppState() {
  const { tracksCollection, addTrack, updateTrack, trackDetail, setNewTrackDetail, player } = useContext(
    AppContext
  ) as AppContextType;
  const [isPlaying, setIsPlaying] = React.useState(false);

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;
    logger.info('new tracks:', newTracks.length);

    newTracks.map((t) => addTrack(t));
  }, [addTrack]);

  const closeDetail = React.useCallback(() => {
    setNewTrackDetail(undefined);
  }, [setNewTrackDetail]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      logger.info('track update', track);

      window.Main.PersistTrack(track);
      updateTrack(track);
      if (trackDetail === track) {
        closeDetail();
      }
    },
    [updateTrack, trackDetail, closeDetail]
  );

  const tracksFixedHandler = React.useCallback(
    (fixedTracks: Track[]) => {
      fixedTracks.map((t) => updateTrack(t));
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
      player.setTrack(t);
      player.play();
      setIsPlaying(true);
    },
    [player]
  );

  const togglePlayPause = React.useCallback(() => {
    if (player.isPaused()) {
      player.play();
      setIsPlaying(true);
    }
    player.pause();
    setIsPlaying(false);
  }, [player]);

  return {
    tracksCollection,
    tracksFixedHandler,
    player,
    isPlaying,
    playTrack,
    togglePlayPause,
    trackDetail,
    setNewTrackDetail,
    onFixAllTracks,
    saveChanges,
    closeDetail,
    onOpenFolder,
    showCtxMenu
  };
}
