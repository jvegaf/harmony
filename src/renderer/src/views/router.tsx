import { LoaderFunctionArgs, Navigate, createHashRouter, isRouteErrorResponse, useRouteError } from 'react-router-dom';

import * as ViewMessage from '../elements/ViewMessage/ViewMessage';
import ExternalLink from '../elements/ExternalLink/ExternalLink';

import RootView from './Root';
import LibraryView from './Library/Library';
import RecentlyAddedView from './RecentlyAdded/RecentlyAdded';
import DetailsView from './Details/Details';
import SettingsView from './Settings/Settings';
import PruneView from './Prune/PruneView';
import PreparationView from './Preparation/PreparationView';
import ToolsView from './Tools/ToolsView';
import PlaylistView from './Playlist/PlaylistView';

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
        index: true,
        element: (
          <Navigate
            to='/library'
            replace
          />
        ),
      },
      {
        path: 'library',
        id: 'library',
        element: <LibraryView />,
        loader: LibraryView.loader,
      },
      {
        path: 'recent_added',
        id: 'recent_added',
        element: <RecentlyAddedView />,
        loader: RecentlyAddedView.loader,
      },
      {
        path: 'playlists/:playlistID',
        id: 'playlists',
        element: <PlaylistView />,
        loader: PlaylistView.loader,
      },
      {
        path: 'settings',
        id: 'settings',
        element: <SettingsView />,
        loader: SettingsView.loader,
      },
      {
        path: 'prune',
        id: 'prune',
        element: <PruneView />,
        loader: PruneView.loader,
      },
      {
        path: 'preparation',
        id: 'preparation',
        element: <PreparationView />,
        loader: PreparationView.loader,
      },
      {
        path: 'details/:trackID',
        element: <DetailsView />,
        loader: DetailsView.loader,
      },
      {
        path: 'tools',
        element: <ToolsView />,
        loader: ToolsView.loader,
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
