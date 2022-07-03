import React, { useEffect, useState } from 'react';
import { Track } from '../electron/types/emusik';
import AppHeader from './components/AppHeader';
import OnBoarding from './components/OnBoarding';
import Detail from './components/Detail';
import TrackList from './components/TrackList';
import useAppState from './hooks/useAppState';

function App() {
  const { tracks, setTrackPlaying, updateTrack, setTrackDetail, trackDetail, onFixTrack, onFixSelectedTracks } =
    useAppState();
  const [content, setContent] = useState(<OnBoarding />);

  useEffect(() => {
    if (window.Main) {
      window.Main.once('track-fixed', (track: Track) => updateTrack(track));
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
      <div>
        <AppHeader />
      </div>
      <div className="grow">{content}</div>
    </div>
  );
}

export default App;
