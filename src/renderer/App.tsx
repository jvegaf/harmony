import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ProcessFiles } from 'src/shared/types/emusik';
import './App.css';
import useMain from './Hooks/useMain';
import HomeView from './Views/HomeView';
import TracksView from './Views/TracksView';

function App() {
  const { filesToProcess } = useMain();

  React.useEffect(() => {
    window.ipc.receive('FILES_INFO', (processFiles) => filesToProcess(processFiles as ProcessFiles));
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