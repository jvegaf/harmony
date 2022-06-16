import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { AudioPlayerProvider } from 'react-use-audio-player';
import { AppContextProvider } from './context/AppContext';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <AppContextProvider>
      <AudioPlayerProvider>
        <App />
      </AudioPlayerProvider>
    </AppContextProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
