import AppBar from '../components/AppBar';
import {Outlet} from 'react-router-dom';
import classes from './Layout.module.css';
import {useViewportSize} from '@mantine/hooks';
import {useEffect} from 'react';
import useAppStore from '../stores/useAppStore';

export function RootLayout() {
  const {height} = useViewportSize();
  const updateHeight = useAppStore(state => state.updateHeight);

  useEffect(() => {
    updateHeight(height);
  }, [height]);

  return (
    <div className={classes.rlayout}>
      <div className={classes.topbar}>
        <AppBar />
      </div>
      <main className={classes.outler_container}>
        <Outlet />
      </main>
    </div>
  );
}
