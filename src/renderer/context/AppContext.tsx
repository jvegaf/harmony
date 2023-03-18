import React from 'react';
import type { AppContextType } from '../@types/emusik';

const AppContext = React.createContext({} as AppContextType);

export function AppContextProvider({ children }: {
  children: React.ReactNode;
}){
  const [ tracksLoaded, setTracksLoaded ] = React.useState(false);

  return (
    <AppContext.Provider
      value={{
        tracksLoaded,
        setTracksLoaded
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
