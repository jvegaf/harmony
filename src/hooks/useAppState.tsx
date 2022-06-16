/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext, useState } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
import AppContext from '../context/AppContext';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } = useContext(AppContext);
  const [updatedTracks, setUpdatedTracks] = useState<Track[]>([]);

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;
    if (tracks.length) setTracks([]);

    setTracks(newTracks);
  }, [tracks, setTracks]);

  const onFixTracks = React.useCallback(
    async (selected: Track[]) => {
      console.log('tracks to fix:', selected);
      const fixedTracks = await window.Main.FixTracks(selected);
      console.log(fixedTracks);
      setUpdatedTracks(fixedTracks);
      const newTracks = tracks.map((t) => {
        const fixed = fixedTracks.find((ft) => ft.id === t.id);
        if (fixed) {
          return fixed;
        }
        return t;
      });
      setTracks(newTracks);
    },
    [tracks, setTracks, setUpdatedTracks]
  );

  const closeDetail = React.useCallback(() => {
    setTrackDetail(undefined);
  }, [setTrackDetail]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      console.log('track update', track);

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

  const showCtxMenu = React.useCallback((selected: Track[]) => window.Main.ShowContextMenu(selected), []);

  const onFixAllTracks = React.useCallback(() => onFixTracks(tracks), [onFixTracks, tracks]);

  const onFixSelectedTracks = React.useCallback(
    (selected: Track[]) => {
      console.log('selectedTracks', selected);

      onFixTracks(selected);
    },
    [onFixTracks]
  );

  return {
    tracks,
    trackPlaying,
    setTrackPlaying,
    trackDetail,
    setTrackDetail,
    onFixTrack,
    onFixTracks,
    onFixSelectedTracks,
    onFixAllTracks,
    saveChanges,
    closeDetail,
    onOpenFolder,
    showCtxMenu,
    updatedTracks,
    setUpdatedTracks
  };
}
