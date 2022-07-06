import React, { useEffect, useState } from 'react';
import AppHeader from './components/AppHeader';
import OnBoarding from './components/OnBoarding';
import Detail from './components/Detail';
import TrackList from './components/TrackList';
import useAppState from './hooks/useAppState';

function App() {
  const { trackDetail } = useAppState();
  const [content, setContent] = useState(<OnBoarding />);
  const [haveTracks, setHaveTracks] = useState(false);

  useEffect(() => {
    if (window.Main) {
      window.Main.on('tracks-updated', () => {
        setHaveTracks(true);
        window.Main.GetAll();
      });
    }
  }, []);

  useEffect(() => {
    if (haveTracks) {
      setContent(<TrackList />);
    }

    if (!haveTracks) {
      setContent(<OnBoarding />);
    }

    if (trackDetail) {
      setContent(<Detail />);
    }
  }, [haveTracks, trackDetail, setContent]);

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
