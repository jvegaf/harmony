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
import IPCMenuEvents from '../components/Events/IPCMenuEvents';
import Header from '../components/Header/Header';

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
      <header className={styles.headerContent}>
        <Header />
      </header>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
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
