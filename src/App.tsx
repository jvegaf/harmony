import React from 'react';
import AppMain from './containers/AppMain';
import LibraryProvider from './context/LibraryContext';

function App() {
  return (
    <LibraryProvider>
      <AppMain />
    </LibraryProvider>
  );
}

export default App;
