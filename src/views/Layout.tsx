import AppBar from '../components/AppBar';
import {Outlet} from 'react-router-dom';
import classes from './Layout.module.css';

export function RootLayout() {
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
