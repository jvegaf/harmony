import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { NEW_TRACK, TOTAL_FILES } from 'src/shared/types/channels';
import { Track } from 'src/shared/types/emusik';
import './App.css';
import useMain from './Hooks/useMain';
import HomeView from './Views/HomeView';
import TracksView from './Views/TracksView';

function App() {
  const { filesToProcess, addTrack } = useMain();

  React.useEffect(() => {
    window.ipc.receive(TOTAL_FILES, (total) => filesToProcess(total as number));
    window.ipc.receive(NEW_TRACK, (track) => addTrack(track as Track));
  });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/tracks" element={<TracksView />} />
      </Routes>
    </Router>
  );
}

export default App;