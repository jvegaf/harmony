import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { FILE_DONE, TOTAL_FILES } from 'src/shared/types/channels';
import './App.css';
import useMain from './Hooks/useMain';
import HomeView from './Views/HomeView';
import TracksView from './Views/TracksView';

function App() {
  const { filesToProcess, fileDone } = useMain();

  React.useEffect(() => {
    window.ipc.receive(TOTAL_FILES, (total) => filesToProcess(total as number));
    window.ipc.receive(FILE_DONE, () => fileDone());
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