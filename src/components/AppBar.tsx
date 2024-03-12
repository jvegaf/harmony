import classes from './AppBar.module.css';
import {Player} from './Player';

export default function AppBar() {
  return (
    <header className={classes.header}>
      <Player />
    </header>
  );
}
