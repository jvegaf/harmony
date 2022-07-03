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
      const newTracks = tracks.map(t => {
        const fixed = fixedTracks.find(ft => ft.id === t.id);
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

  const updateTrack = (updated: Track) => {
    console.log('updated', updated);
    console.log('tracks length', tracks.length);

    const newtracks = tracks.map(t => (updated.id === t.id ? updated : t));
    console.log(newtracks.length);

    setTracks(newtracks);
  };

  const saveChanges = React.useCallback(
    (track: Track) => {
      window.Main.PersistTrack(track);
      updateTrack(track);
      if (trackDetail.id === track.id) {
        closeDetail();
      }
    },
    [trackDetail, closeDetail]
  );

  const onFixTrack = React.useCallback((track: Track) => window.Main.FixTrack(track), []);

  const onFixAllTracks = React.useCallback(() => onFixTracks(tracks), [onFixTracks, tracks]);

  const onFixSelectedTracks = React.useCallback(
    (selected: Track[]) => {
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
    updateTrack,
    onFixTrack,
    onFixTracks,
    onFixSelectedTracks,
    onFixAllTracks,
    onFindArtwork,
    saveChanges,
    closeDetail,
    onOpenFolder
  };
}
