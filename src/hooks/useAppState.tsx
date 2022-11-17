/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
import AppContext from '../context/AppContext';
import logger from '../../electron/services/logger';

export default function useAppState() {
  const { tracks, setTracks, trackDetail, setTrackDetail, audioplayer } = useContext(AppContext);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;

    setTracks(newTracks);
  }, [setTracks]);

  const onFixTracks = React.useCallback(
    async (trks: Track[]) => {
      logger.info('tracks to fix:', trks);
      const fixedTracks = await window.Main.FixTracks(trks);
      const updTracks = tracks.map((t) => {
        const fixedTrack = fixedTracks.find((ft) => ft.id === t.id);
        if (fixedTrack) {
          return fixedTrack;
        }
        return t;
      });
      setTracks(updTracks);
    },
    [setTracks, tracks]
  );

  const closeDetail = React.useCallback(() => {
    setTrackDetail(undefined);
  }, [setTrackDetail]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      logger.info('track update', track);

      window.Main.PersistTrack(track);
      const newTracks = tracks.map((t) => {
        if (t.id === track.id) {
          return track;
        }
        return t;
      });
      setTracks(newTracks);
      if (trackDetail === track.id) {
        closeDetail();
      }
    },
    [tracks, setTracks, trackDetail, closeDetail]
  );

  const onFixTrack = React.useCallback(
    async (id: TrackId) => {
      const track = tracks.find((t) => t.id === id);

      const updated = await window.Main.FixTrack(track);
      saveChanges(updated);
    },
    [tracks, saveChanges]
  );

  const showCtxMenu = React.useCallback((selected: TrackId[]) => window.Main.ShowContextMenu(selected), []);

  const onFixAllTracks = React.useCallback(() => onFixTracks(tracks), [onFixTracks, tracks]);

  const onFixSelectedTracks = React.useCallback(
    (selected: TrackId[]) => {
      const selectedTracks = [];

      selected.forEach((tId) => {
        const track = tracks.find((t) => t.id === tId);
        selectedTracks.push(track);
      });

      logger.info('selectedTracks', selectedTracks);

      onFixTracks(selectedTracks);
    },
    [tracks, onFixTracks]
  );

  const playTrack = React.useCallback(
    (id: TrackId) => {
      const track = tracks.find((t) => t.id === id);
      audioplayer.setTrack(track);
      audioplayer.play();
      setIsPlaying(true);
    },
    [tracks, audioplayer]
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
    tracks,
    audioplayer,
    isPlaying,
    playTrack,
    togglePlayPause,
    trackDetail,
    setTrackDetail,
    onFixTrack,
    onFixTracks,
    onFixSelectedTracks,
    onFixAllTracks,
    saveChanges,
    closeDetail,
    onOpenFolder,
    showCtxMenu
  };
}
