import React from "react";
import type { AppContextType } from "../@types/emusik";

const AppContext = React.createContext({} as AppContextType);

export function AppContextProvider({ children }: {
  children: React.ReactNode;
}){
  const [ trackPlaying, setTrackPlaying ] = React.useState<TrackId>();
  const [ trackDetail, setTrackDetail ]   = React.useState<TrackId>();
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
