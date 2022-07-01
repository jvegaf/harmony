/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext } from 'react';
import { Track } from '../../electron/types/emusik';
import AppContext from '../context/AppContext';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } = useContext(AppContext);

  const onOpenFolder = React.useCallback(async () => {
    if (tracks.length) setTracks([]);
    const newTracks = await window.Main.OpenFolder();

    if (!newTracks) return;

    setTracks(newTracks);
  }, [tracks, setTracks]);

  const onFixTracks = React.useCallback(
    async (selected: Track[]) => {
      const fixedTracks = await window.Main.FixTracks(selected);
      const newTracks = tracks.map((t) => {
        const fixed = fixedTracks.find((ft) => ft.id === t.id);
        if (fixed) {
          return fixed;
        }
        return t;
      });
      setTracks(newTracks);
    },
    [tracks, setTracks]
  );

  const closeDetail = React.useCallback(() => {
    setTrackDetail(null);
  }, [setTrackDetail]);

  const saveChanges = React.useCallback(
    (track: Track) => {
      window.Main.PersistTrack(track);
      const newTracks = tracks.map((t) => {
        if (t.id === track.id) {
          return track;
        }
        return t;
      });
      setTracks(newTracks);
      if (trackDetail.id === track.id) {
        closeDetail();
      }
    },
    [tracks, setTracks, trackDetail, closeDetail]
  );

  const onFixTrack = React.useCallback(
    async (track: Track) => {
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

  const onFindArtwork = React.useCallback((track: Track) => window.Main.FindArtwork(track), []);

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
    onFindArtwork,
    saveChanges,
    closeDetail,
    onOpenFolder,
    showCtxMenu
  };
}
