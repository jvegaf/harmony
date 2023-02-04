import React, { useContext, useEffect, useState } from 'react';
import { Track } from '../electron/types/emusik';
import { AppContextType } from './@types/emusik';
import AppHeader from './components/AppHeader';
import OnBoarding from './components/OnBoarding';
import TrackDetailView from './components/TrackDetail';
import TrackList from './components/TrackList';
import { AppContext } from './context/AppContext';
import useAppState from './hooks/useAppState';

function App() {
  const { playTrack, setNewTrackDetail, trackDetail, tracksFixedHandler } = useAppState();
  const { tracksCollection } = useContext(AppContext) as AppContextType;
  const [content, setContent] = useState(<OnBoarding />);

  useEffect(() => {
    if (window.Main) {
      window.Main.on('view-detail-command', (track: Track) => setNewTrackDetail(track));

      window.Main.on('play-command', (track: Track) => playTrack(track));

      window.Main.on('tracks-fixed', (fxdTrks: Track[]) => tracksFixedHandler(fxdTrks));
    }
  }, [window]);

  useEffect(() => {
    if (tracksCollection.length) {
      setContent(<TrackList />);
    }

    if (trackDetail) {
      setContent(<TrackDetailView />);
    }
  }, [tracksCollection, trackDetail, setContent]);

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="grow">{content}</div>
    </div>
  );
}

export default App;
