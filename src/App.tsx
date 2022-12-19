import React, { useEffect, useState } from 'react';
import { Track } from '../electron/types/emusik';
import AppHeader from './components/AppHeader';
import OnBoarding from './components/OnBoarding';
import TrackDetailView from './components/TrackDetail';
import TrackList from './components/TrackList';
import useAppState from './hooks/useAppState';

function App() {
  const { collection, setCollection, playTrack, setTrackDetail, trackDetail, tracksFixedHandler } = useAppState();
  const [content, setContent] = useState(<OnBoarding />);

  useEffect(() => {
    if (window.Main) {
      window.Main.on('view-detail-command', (track: Track) => setTrackDetail(track));

      window.Main.on('play-command', (track: Track) => playTrack(track));

      window.Main.on('tracks-fixed', (fxdTrks: Track[]) => tracksFixedHandler(fxdTrks));

      // only for development
      window.Main.on('new-tracks-command', (newtracks: Track[]) => setCollection(newtracks));
    }
  }, [window]);

  useEffect(() => {
    if (collection.length > 0) {
      setContent(<TrackList />);
    }

    if (trackDetail) {
      setContent(<TrackDetailView />);
    }
  }, [collection, trackDetail, setContent]);

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="grow">{content}</div>
    </div>
  );
}

export default App;
