/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useContext } from 'react';
import AppContext from 'renderer/context/AppContext';
import { Track } from 'shared/types/emusik';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } = useContext(AppContext);

  const { fixTrack, fixTracks, on, openFolder, showContextMenu } = window.electron.ipcRenderer;

  const onOpenFolder = React.useCallback(async () => {
    const newTracks = await openFolder();
    if (!newTracks) return;

    setTracks(newTracks);
  }, [openFolder, setTracks]);

  const onFixTracks = React.useCallback(
    async (trks: Track[]) => {
      const fixedTracks = await fixTracks(trks);
      const updTracks = tracks.map(t => {
        const fixedTrack = fixedTracks.find(ft => ft.id === t.id);
        if (fixedTrack) {
          return fixedTrack;
        }
        return t;
      });
      setTracks(updTracks);
    },
    [fixTracks, setTracks, tracks]
  );

  const updateTrack = React.useCallback(
    (track: Track) => {
      const index = tracks.findIndex(t => t.id === track.id);
      tracks[index] = track;
      setTracks([...tracks]);
      if (trackDetail && trackDetail.id === track.id) {
        setTrackDetail(null);
      }
    },
    [tracks, setTracks, trackDetail, setTrackDetail]
  );

  const onFixTrack = React.useCallback(
    async (id: string) => {
      const track = tracks.find(t => t.id === id);
      const updated = await fixTrack(track);
      updateTrack(updated);
    },
    [fixTrack, tracks, updateTrack]
  );

  const showCtxMenu = React.useCallback((trackId: string) => showContextMenu(trackId), [showContextMenu]);

  const onFixAllTracks = React.useCallback(() => onFixTracks(tracks), [onFixTracks, tracks]);

  on('view-detail-command', (trackId: string) => setTrackDetail(tracks.find(t => t.id === trackId)));

  on('play-command', (trackId: string) => setTrackPlaying(tracks.find(t => t.id === trackId)));

  on('fix-track-command', (trackId: string) => onFixTrack(trackId));

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
