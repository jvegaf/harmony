import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import AppActions from '../stores/AppAPI';
import MediaSessionEvents from '../components/Events/MediaSessionEvents';
import AppEvents from '../components/Events/AppEvents';
import PlayerEvents from '../components/Events/PlayerEvents';
import IPCPlayerEvents from '../components/Events/IPCPlayerEvents';
import IPCNavigationEvents from '../components/Events/IPCNavigationEvents';
import GlobalKeyBindings from '../components/Events/GlobalKeyBindings';

import styles from './Root.module.css';
import { LoaderData } from './router';
import { PlayerBar } from '../components/Player/PlayerBar';
import IPCMenuEvents from '../components/Events/IPCMenuEvents';

const { db } = window.Main;

export default function ViewRoot() {
  useEffect(() => {
    AppActions.init();
  }, []);

  return (
    <div className={styles.root}>
      {/** Bunch of global event handlers */}
      <IPCNavigationEvents />
      <IPCPlayerEvents />
      <AppEvents />
      <PlayerEvents />
      <MediaSessionEvents />
      <GlobalKeyBindings />
      <IPCMenuEvents />
      {/** The actual app */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <footer className={styles.playerContent}>
        <PlayerBar />
      </footer>
    </div>
  );
}

export type RootLoaderData = LoaderData<typeof ViewRoot.loader>;

ViewRoot.loader = async () => {
  // this can be slow, think about caching it or something, especially when
  // we revalidate routing
  const tracks = await db.tracks.getAll();
  return { tracks };
};
