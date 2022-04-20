import React from 'react';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import MainView from './views/MainView';
import './App.css';

export default function App() {
  return (
    <MantineProvider theme={{ colorScheme: 'dark' }}>
      <Router>
        <Routes>
          <Route path="/" element={<MainView />} />
        </Routes>
      </Router>
    </MantineProvider>
  );
}
