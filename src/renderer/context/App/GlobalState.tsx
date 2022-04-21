import React, { useReducer } from 'react';
import { GlobalContext } from './GlobalContext';
import { GlobalReducer } from './GlobalReducer';

const GlobalState: React.FC<React.ReactNode> = ({ children }) => {
  const initialState = {
    tracks: [],
  };

  const [state, dispatch] = useReducer(GlobalReducer, initialState);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  return (
    <GlobalContext.Provider
      value={{
        tracks: state.tracks,
        openFolder,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalState;
