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

  const addTracks = (newTracks: React.SetStateAction<Track[]>) =>
    setTracks(newTracks);

  return (
    <AppContext.Provider
      value={{
        tracks,
        addTracks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
