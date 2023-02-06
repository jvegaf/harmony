import React from 'react';
import { AudioPlayerProvider } from 'react-use-audio-player';
import AppMain from './containers/AppMain';
import LibraryProvider from './context/LibraryContext';

function App() {
  return (
    <AudioPlayerProvider>
      <LibraryProvider>
        <AppMain />
      </LibraryProvider>
    </AudioPlayerProvider>
  );
}

export default App;
