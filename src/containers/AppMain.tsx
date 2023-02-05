import React from 'react';
import { LibraryContextType } from '../@types/library';
import AppHeader from '../components/AppHeader';
import OnBoarding from '../components/OnBoarding';
import TrackList from '../components/TrackList';
import { LibraryContext } from '../context/LibraryContext';

const AppMain = () => {
  const { tracksCollection } = React.useContext(LibraryContext) as LibraryContextType;
  const [content, setContent] = React.useState(<OnBoarding />);

  // React.useEffect(() => {
  //   if (window.Main) {
  //     window.Main.on('view-detail-command', (track: Track) => setNewTrackDetail(track));
  //
  //     window.Main.on('play-command', (track: Track) => playTrack(track));
  //
  //     window.Main.on('tracks-fixed', (fxdTrks: Track[]) => tracksFixedHandler(fxdTrks));
  //   }
  // }, [window]);

  React.useEffect(() => {
    if (tracksCollection.length) {
      setContent(<TrackList tracks={tracksCollection} />);
    }
  }, [tracksCollection]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="grow bg-neutral-800 overflow-y-auto">{content}</div>
    </div>
  );
};

export default AppMain;
