import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Providers from './Providers';
import { DetailView, HomeView, RootLayout, WelcomeView, detailLoader } from './views';
import { useEffect } from 'react';
import { FIX_COMMAND } from '../electron/lib/ipc/channels';
import type { Track } from '../electron/types';
import useLibraryStore from './stores/useLibraryStore';
import './App.css';

export default function App() {
  const tracks = useLibraryStore(state => state.tracks);

  useEffect(() => {
    window.Main.on(FIX_COMMAND, (selected: Track[]) => selected.forEach(t => window.Main.FixTrack(t)));
    // window.Main.on(TRACK_UPDATED, (updated: Track) => dispatch(updateTrack(updated)));
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
          path: 'detail/:id',
          loader: detailLoader,
          Component: DetailView,
        },
      ],
    },
  ]);

  return (
    <>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </>
  );
}
