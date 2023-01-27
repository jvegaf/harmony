/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext } from 'react';
import { Track } from '../../electron/types/emusik';
import { AppContext } from '../context/AppContext';
import logger from '../../electron/services/logger';
import { AppContextType } from '../@types/emusik';

export default function useAppState() {
  const { tracksCollection, setNewCollection, trackDetail, setNewTrackDetail, audioplayer } = useContext(
    AppContext
  ) as AppContextType;
  const [isPlaying, setIsPlaying] = React.useState(false);

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;
    logger.info('new tracks:', newTracks.length);

    setNewCollection(newTracks);
  }, [setNewCollection]);

  const closeDetail = React.useCallback(() => {
    setNewTrackDetail(undefined);
  }, [setNewTrackDetail]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      logger.info('track update', track);

      window.Main.PersistTrack(track);
      const filtered = tracksCollection.filter((t) => t.id !== track.id);
      const allTracks = [...filtered, track];
      setNewCollection(allTracks);
      if (trackDetail === track) {
        closeDetail();
      }
    },
    [tracksCollection, setNewCollection, trackDetail, closeDetail]
  );

  const tracksFixedHandler = React.useCallback(
    (fixedTracks: Track[]) => {
      console.log('tracksCollection length: ' + tracksCollection.length);

      const filtered = tracksCollection.filter((t) => fixedTracks.includes(t) === false);
      console.log('filtered tracksCollection length: ' + filtered.length);

      const allTracks = filtered.concat(fixedTracks);
      console.log('all tracksCollection length: ' + allTracks.length);

      setNewCollection(allTracks);
    },
    [tracksCollection, setNewCollection]
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
      audioplayer.setTrack(t);
      audioplayer.play();
      setIsPlaying(true);
    },
    [audioplayer]
  );

  const togglePlayPause = React.useCallback(() => {
    if (audioplayer.isPaused()) {
      audioplayer.play();
      setIsPlaying(true);
    }
    audioplayer.pause();
    setIsPlaying(false);
  }, [audioplayer]);

  return {
    tracksCollection,
    tracksFixedHandler,
    audioplayer,
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
