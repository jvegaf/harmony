import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { NEW_TRACK } from 'src/shared/types/channels';
import { Track } from 'src/shared/types/emusik';
import './App.css';
import { addTrack } from './features/collection/collectionSlice';
import { useAppDispatch } from './hooks';
import HomeView from './Views/HomeView';
import TracksView from './Views/TracksView';

function App() {

  const dispatch = useAppDispatch();

  React.useEffect(() => {
    // window.ipc.receive(TOTAL_FILES, (total) => filesToProcess(total as number));
    window.ipc.receive(NEW_TRACK, (track) => dispatch(addTrack(track as Track)));
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