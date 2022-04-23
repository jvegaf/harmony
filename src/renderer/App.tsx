/* eslint-disable no-console */
import React from 'react';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import MainView from './views/MainView';
import GlobalState from './context/App/GlobalState';
import './App.css';

export default function App() {
  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('add-tracks', (arg) => {
    console.log(`renderer tracks: ${arg.length}`);
  });

  return (
    <GlobalState>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        <Router>
          <Routes>
            <Route path="/" element={<MainView />} />
          </Routes>
        </Router>
      </MantineProvider>
    </GlobalState>
  );
}
