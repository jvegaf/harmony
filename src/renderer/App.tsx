import { MantineProvider } from '@mantine/core';
import React from 'react';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import { AudioPlayerProvider } from 'react-use-audio-player';
import { NEW_TRACK } from 'shared/types/channels';
import { Track } from 'shared/types/emusik';
import './App.css';
import { AppContextProvider } from './context/AppContext';
import { PlayerContextProvider } from './context/PlayerContext';
import { addNewTrack } from './features/collection/collectionSlice';
import { useAppDispatch } from './hooks';
import ArtsFinderView from './views/ArtsFinderView';
import MainView from './views/MainView';
import TrackDetailView from './views/TrackDetailView';
import WelcomeView from './views/WelcomeView';

export default function App() {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    window.Main.on(NEW_TRACK, (track: Track) => dispatch(addNewTrack(track)));
  }, []);

  return (
    <AudioPlayerProvider>
      <AppContextProvider>
        <PlayerContextProvider>
          <MantineProvider theme={{ colorScheme: 'dark' }}>
            <Router>
              <Routes>
                <Route path="/detail/:trackId" element={<TrackDetailView />} />
                <Route path="/arts" element={<ArtsFinderView />} />
                <Route path="/welcome" element={<WelcomeView />} />
                <Route path="/" element={<MainView />} />
              </Routes>
            </Router>
          </MantineProvider>
        </PlayerContextProvider>
      </AppContextProvider>
    </AudioPlayerProvider>
  );
}