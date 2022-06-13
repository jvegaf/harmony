/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { once } from 'events';
import React, { useContext } from 'react';
import AppContext from 'renderer/context/AppContext';
import { Track, TrackId } from 'shared/types/emusik';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } = useContext(AppContext);

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await window.electron.ipcRenderer.openFolder();
    if (!newTracks) return;

    setTracks(newTracks);
  }, [setTracks]);

  const onFixTracks = React.useCallback(
    async (trks: Track[]) => {
      const fixedTracks = await window.electron.ipcRenderer.fixTracks(trks);
      const updTracks = tracks.map(t => {
        const fixedTrack = fixedTracks.find(ft => ft.id === t.id);
        if (fixedTrack) {
          return fixedTrack;
        }
        return t;
      });
      setTracks(updTracks);
    },
    [setTracks, tracks]
  );

  const updateTrack = React.useCallback(
    (track: Track) => {
      console.log('track update', track);

      window.electron.ipcRenderer.persistTrack(track);
      const newTracks = tracks.map(t => {
        if (t.id === track.id) {
          return track;
        }
        return t;
      });
      setTracks(newTracks);
      if (trackDetail === track.id) {
        setTrackDetail(undefined);
      }
    },
    [tracks, setTracks, trackDetail, setTrackDetail]
  );

  const onFixTrack = React.useCallback(
    async (id: TrackId) => {
      const track = tracks.find(t => t.id === id);
      console.log('track to fix', track);

      const updated = await window.electron.ipcRenderer.fixTrack(track);
      updateTrack(updated);
    },
    [tracks, updateTrack]
  );

  const showCtxMenu = React.useCallback((trackId: TrackId) => window.electron.ipcRenderer.showContextMenu(trackId), []);

  const onFixAllTracks = React.useCallback(() => onFixTracks(tracks), [onFixTracks, tracks]);

  return {
    tracks,
    trackPlaying,
    setTrackPlaying,
    trackDetail,
    setTrackDetail,
    onFixTrack,
    onFixTracks,
    onFixAllTracks,
    updateTrack,
    onOpenFolder,
    showCtxMenu,
  };
}
