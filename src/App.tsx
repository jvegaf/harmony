import React, { useEffect, useState } from 'react';
import { Track } from '../electron/types/emusik';
import AppHeader from './components/AppHeader';
import OnBoarding from './components/OnBoarding';
import Detail from './components/Detail';
import TrackList from './components/TrackList';
import useAppState from './hooks/useAppState';

function App() {
  const { tracks, setTrackPlaying, setTrackDetail, trackDetail, onFixTrack, onFixSelectedTracks } = useAppState();
  const [content, setContent] = useState(<OnBoarding />);

  useEffect(() => {
    if (window.Main) {
      window.Main.on('view-detail-command', (track: Track) => setTrackDetail(track));

      window.Main.on('play-command', (track: Track) => setTrackPlaying(track));

      window.Main.on('fix-track-command', (track: Track) => onFixTrack(track));

      window.Main.on('fix-tracks-command', (selected: Track[]) => onFixSelectedTracks(selected));
    }
  }, []);

  useEffect(() => {
    if (tracks.length > 0) {
      setContent(<TrackList />);
    }

    if (tracks.length < 1) {
      setContent(<OnBoarding />);
    }

    if (trackDetail) {
      setContent(<Detail />);
    }
  }, [tracks, trackDetail, setContent]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <div className="grow-0">
        <AppHeader />
      </div>
      <div className="grow">{content}</div>
    </div>
  );
}

export default App;
