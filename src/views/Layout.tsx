import AppBar from '../components/AppBar';
import {Outlet} from 'react-router-dom';
import classes from './Layout.module.css';
import useAppStore from '../stores/useAppStore';
import {useElementSize} from '@mantine/hooks';
import {useEffect} from 'react';

export function RootLayout() {
  const updateHeight = useAppStore(state => state.updateHeight);
  const {ref, height} = useElementSize();

  useEffect(() => {
    updateHeight(height);
  }, [height]);

  return (
    <div className={classes.rlayout}>
      <div className={classes.rlayout__topbar}>
        <AppBar />
      </div>
      <main
        ref={ref}
        className={classes.rlayout__main}
      >
        <Outlet />
      </main>
    </div>
  );
}
