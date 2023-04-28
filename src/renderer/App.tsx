import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HomeView from './Views/HomeView';
import TracksView from './Views/TracksView';

function App() {
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