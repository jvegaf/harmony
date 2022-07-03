import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { CustomProvider } from 'rsuite';
import { AppContextProvider } from './context/AppContext';
import './index.css';
import 'rsuite/dist/rsuite.min.css';

ReactDOM.render(
  <React.StrictMode>
    <AppContextProvider>
      <CustomProvider theme="dark">
        <App />
      </CustomProvider>
    </AppContextProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
