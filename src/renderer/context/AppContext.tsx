import React from 'react';
import type { Track, TrackId } from '../../shared/types/emusik';
import type { AppContextType } from '../@types/emusik';

const AppContext = React.createContext({} as AppContextType);

export function AppContextProvider({ children }: {
  children: React.ReactNode;
}){
  const [ trackPlaying, setTrackPlaying ] = React.useState<Track>(null);
  const [ trackDetail, setTrackDetail ]   = React.useState<TrackId>(null);
  const [ tracksLoaded, setTracksLoaded ] = React.useState(false);

  return (
    <AppContext.Provider
      value={{
        trackPlaying,
        setTrackPlaying,
        trackDetail,
        setTrackDetail,
        tracksLoaded,
        setTracksLoaded
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
