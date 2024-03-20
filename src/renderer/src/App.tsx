import { FC, useEffect } from 'react'
import useLibraryStore from '@renderer/stores/useLibraryStore'
import { Track } from 'src/preload/emusik';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './views/RootLayout';
import { DetailView, HomeView, WelcomeView, detailLoader } from './views';
import { FIX_COMMAND } from '../../preload/channels';

const App: FC = () => {
  const tracks = useLibraryStore(state => state.tracks);

  useEffect(() => {
    window.Main.on(FIX_COMMAND, (selected: Track[]) => selected.forEach(t => window.Main.fixTrack(t)));
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
      <RouterProvider router={router} />
    </>
  );

  // return (
  //   <div className="w-full h-screen flex flex-col px-5 space-y-8 items-center justify-center">
  //     <h1 className="text-5xl font-bold text-center">
  //       Electron-Vite template with ShadcnUI and Tailwindcss
  //     </h1>
  //     <p className="text-lg font-semibold">Start edit code in `src/rerender/src/App.tsx`</p>
  //     <Button asChild>
  //       <a href="/" className="flex gap-2">
  //         Get Started <ArrowRight />{' '}
  //       </a>
  //     </Button>
  //   </div>
  // )
}

export default App
