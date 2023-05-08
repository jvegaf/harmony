import { CssBaseline, GeistProvider } from '@geist-ui/core';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <GeistProvider themeType="dark">
      <CssBaseline />
      <Provider store={store}>
      <App />
      </Provider>
    </GeistProvider>
  </React.StrictMode>
);