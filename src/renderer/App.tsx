import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { NEW_TRACK } from '../shared/types/channels';
import { addTrack } from './features/collection/collectionSlice';
import { useAppDispatch } from './hooks';
import HomeView from './views/HomeView';
import TracksView from './views/TracksView';
import './App.css';

function App() {

  const dispatch = useAppDispatch();

  React.useEffect(() => {
    window.Main.on(NEW_TRACK, (track) => dispatch(addTrack(track)));
  });

  return (
    <Router>
      <Routes>
        <Route path="/welcome" element={<HomeView />} />
        <Route path="/" element={<TracksView />} />
      </Routes>
    </Router>
  );
}

export default App;