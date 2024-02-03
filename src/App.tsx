import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Providers from "./Providers";
import {
  DetailView,
  HomeView,
  RootLayout,
  WelcomeView,
  detailLoader,
} from "./views";
import { useEffect } from "react";
import { FIX_COMMAND, NEW_TRACK } from "../electron/lib/ipc/channels";
import { Track } from "../electron/types";
import useLibraryStore from "./stores/useLibraryStore";
import log from "electron-log/renderer";

export default function App() {
  const addTrack = useLibraryStore((state) => state.addTrack);

  useEffect(() => {
    window.Main.on(NEW_TRACK, (track: Track) => {
      log.info(`Track created: ${track.title}`);
      addTrack(track);
    });
    window.Main.on(FIX_COMMAND, (selected: Track[]) =>
      selected.forEach((t) => window.Main.FixTrack(t)),
    );
    // window.Main.on(TRACK_UPDATED, (updated: Track) => dispatch(updateTrack(updated)));
  }, [addTrack]);

  const router = createBrowserRouter([
    {
      path: "/",
      Component: RootLayout,
      children: [
        {
          index: true,
          Component: HomeView,
        },
        {
          path: "detail/:id",
          loader: detailLoader,
          Component: DetailView,
        },
        {
          path: "welcome",
          Component: WelcomeView,
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
