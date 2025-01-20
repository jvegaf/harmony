import { LoaderFunctionArgs, createHashRouter, isRouteErrorResponse, useRouteError } from 'react-router-dom';

import * as ViewMessage from '../elements/ViewMessage/ViewMessage';
import ExternalLink from '../elements/ExternalLink/ExternalLink';

import RootView from './Root';
import LibraryView from './Library/Library';
import SettingsLibrary from './Settings/SettingsLibrary';
import DetailsView from './Details/Details';
import SettingsView from './Settings/Settings';
import SettingsAudio from './Settings/SettingsAudio';
// import ViewPlaylists from './ViewPlaylists';
// import ViewPlaylistDetails from './ViewPlaylistDetails';

const { logger } = window.Main;

const router = createHashRouter([
  {
    path: '/',
    id: 'root',
    element: <RootView />,
    loader: RootView.loader,
    ErrorBoundary: GlobalErrorBoundary,
    children: [
      {
        // path: 'library',
        id: 'library',
        index: true,
        element: <LibraryView />,
        loader: LibraryView.loader,
      },
      // {
      //   path: 'playlists',
      //   id: 'playlists',
      //   element: <ViewPlaylists />,
      //   loader: ViewPlaylists.loader,
      //   children: [
      //     {
      //       path: ':playlistID',
      //       id: 'playlist-details',
      //       element: <ViewPlaylistDetails />,
      //       loader: ViewPlaylistDetails.loader,
      //     },
      //   ],
      // },
      {
        path: 'settings',
        id: 'settings',
        element: <SettingsView />,
        children: [
          {
            path: 'library',
            element: <SettingsLibrary />,
            loader: SettingsView.loader,
          },
          // {
          //   path: 'interface',
          //   element: <SettingsUI />,
          //   loader: SettingsView.loader,
          // },
          {
            path: 'audio',
            element: <SettingsAudio />,
            loader: SettingsView.loader,
          },
        ],
      },
      {
        path: 'details/:trackID',
        element: <DetailsView />,
        loader: DetailsView.loader,
      },
    ],
  },
]);

export default router;

/**
 * Components helpers
 */

function GlobalErrorBoundary() {
  const error = useRouteError();
  logger.error(error as any);

  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = 'Unknown error';
  }

  return (
    <ViewMessage.Notice>
      <p>
        <span
          role='img'
          aria-label='boom'
        >
          💥
        </span>{' '}
        Something wrong happened: {errorMessage}
      </p>
      <ViewMessage.Sub>
        If it happens again, please{' '}
        <ExternalLink href='https://github.com/jvegaf/harmony/issues'>report an issue</ExternalLink>
      </ViewMessage.Sub>
    </ViewMessage.Notice>
  );
}

/**
 * Loader Types, to manually type useLoaderData()
 */
export type LoaderData<T> = T extends (args: LoaderFunctionArgs) => Promise<infer U> ? Exclude<U, Response> : never;
