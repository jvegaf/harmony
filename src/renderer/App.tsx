import { MantineProvider } from '@mantine/core';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import { AppContextProvider } from './context/AppContext';
import { PlayerContextProvider } from './context/PlayerContext';
import ArtsFinderView from './views/ArtsFinderView';
import MainView from './views/MainView';
import TrackDetailView from './views/TrackDetailView';
import WelcomeView from './views/WelcomeView';

export default function App() {
  return (
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
  );
}