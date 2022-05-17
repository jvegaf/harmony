import React, { useState } from 'react';
import { AppContextType } from 'renderer/@types/emusik';
import { Track } from 'shared/types/emusik';

const AppContext = React.createContext({} as AppContextType);

// eslint-disable-next-line react/prop-types
export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tracks, setTracks] = useState<Array<Track>>([]);
  const [trackPlaying, setTrackPlaying] = useState<Track>(undefined);
  const [trackDetail, setTrackDetail] = useState<Track>(undefined);

  return (
    <AppContext.Provider
      value={{
        tracks,
        setTracks,
        trackPlaying,
        setTrackPlaying,
        trackDetail,
        setTrackDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
