import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AudioPlayerProvider } from 'react-use-audio-player';
import MainView from './views/MainView';
import './App.css';
import { AppContextProvider } from './context/AppContext';

export default function App() {
    return (
        <AppContextProvider>
            <MantineProvider theme={{ colorScheme: 'dark' }}>
                <AudioPlayerProvider>
                    <Router>
                        <Routes>
                            <Route path="/" element={<MainView />} />
                        </Routes>
                    </Router>
                </AudioPlayerProvider>
            </MantineProvider>
        </AppContextProvider>
    );
}
