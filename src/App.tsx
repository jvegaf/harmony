import React, { useEffect, useState } from 'react';
import { Track, TrackId } from '../electron/types/emusik';
import AppHeader from './components/AppHeader';
import OnBoarding from './components/OnBoarding';
import TrackDetail from './components/TrackDetail';
import TrackList from './components/TrackList';
import useAppState from './hooks/useAppState';

function App() {
  const { tracks, setTrackPlaying, setTrackDetail, trackDetail, onFixTrack, onFixSelectedTracks } = useAppState();
  const [content, setContent] = useState(<OnBoarding />);

  useEffect(() => {
    if (window.Main) {
      window.Main.on('view-detail-command', (trackId: TrackId) => setTrackDetail(trackId));

      window.Main.on('play-command', (trackId: TrackId) => setTrackPlaying(trackId));

      window.Main.on('fix-track-command', (trackId: TrackId) => onFixTrack(trackId));

      window.Main.on('fix-tracks-command', (selected: Track[]) => onFixSelectedTracks(selected));
    }
  }, []);

  useEffect(() => {
    if (tracks.length > 0) {
      setContent(<TrackList />);
    }

    if (trackDetail) {
      setContent(<TrackDetail />);
    }
  }, [tracks, trackDetail, setContent]);

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="grow">{content}</div>
    </div>
  );
}

export default App;
