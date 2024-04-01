import { FC, useEffect } from 'react';
import useLibraryStore from '@renderer/stores/useLibraryStore';
import { Track } from 'src/preload/emusik';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './views/RootLayout';
import { DetailView, HomeView, WelcomeView } from './views';
import { TRACK_UPDATED } from '../../preload/channels';
import './App.css';

const App: FC = () => {
  const tracks = useLibraryStore(state => state.tracks);
  const updateTrack = useLibraryStore(state => state.updateTrack);

  useEffect(() => {
    // window.Main.on(FIX_COMMAND, (selected: Track[]) => selected.forEach(t => window.Main.fixTrack(t)));
    window.Main.on(TRACK_UPDATED, (updated: Track) => updateTrack(updated));
  }, []);

  const router = createBrowserRouter([
    {
      path: '/',
      Component: RootLayout,
      children: [
        {
          index: true,
          Component: tracks.length ? HomeView : WelcomeView,
        },
        {
          path: 'detail/:trackId',
          Component: DetailView,
        },
      ],
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
};

export default App;
