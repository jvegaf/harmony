import { MantineProvider } from '@mantine/core';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import { AppContextProvider } from './context/AppContext';
import { PlayerContextProvider } from './context/PlayerContext';
import MainView from './views/MainView';
import TrackDetailView from './views/TrackDetailView';

export default function App() {
  return (
    <AppContextProvider>
      <PlayerContextProvider>
        <MantineProvider theme={{ colorScheme: 'dark' }}>
          <Router>
            <Routes>
              <Route path='/' element={<MainView />} />
              <Route path='/detail/:trackId' element={<TrackDetailView />} />
            </Routes>
          </Router>
        </MantineProvider>
      </PlayerContextProvider>
    </AppContextProvider>
  );
}
