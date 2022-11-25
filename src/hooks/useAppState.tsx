/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
import AppContext from '../context/AppContext';
import logger from '../../electron/services/logger';

export default function useAppState() {
  const { collection, setCollection, trackDetail, setTrackDetail, audioplayer } = useContext(AppContext);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;
    logger.info('new tracks:', newTracks.length);

    setCollection(newTracks);
  }, [setCollection]);

  const onFixTracks = React.useCallback((trks: Track[]) => {
    logger.info('tracks to fix:', trks);
    window.Main.FixTracks(trks);
  },
    []
  );

  const closeDetail = React.useCallback(() => {
    setTrackDetail(undefined);
  }, [setTrackDetail]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      logger.info('track update', track);

      window.Main.PersistTrack(track);
      const filtered = collection.filter(t => t.id !== track.id);
      const allTracks = [...filtered, track];
      setCollection(allTracks);
      if (trackDetail === track) {
        closeDetail();
      }
    },
    [collection, setCollection, trackDetail, closeDetail]
  );

  const tracksFixedHandler = React.useCallback(
    (fixedTracks: Track[]) => {
      const filtered = collection.filter(t => fixedTracks.includes(t) === false);
      const allTracks = filtered.concat(fixedTracks);
      setCollection(allTracks);
    },
    [collection]
  );

  const showCtxMenu = React.useCallback(
    (selected: Track[]) => {
      logger.info('selected in hook:', selected);
      window.Main.ShowContextMenu(selected);
    },
    [window]
  );

  const onFixAllTracks = React.useCallback(() => window.Main.FixTracks(collection), [collection]);

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
    collection,
    setCollection, // TODO: FIXME
    tracksFixedHandler,
    audioplayer,
    isPlaying,
    playTrack,
    togglePlayPause,
    trackDetail,
    setTrackDetail,
    onFixAllTracks,
    saveChanges,
    closeDetail,
    onOpenFolder,
    showCtxMenu
  };
}
