import classes from './AppBar.module.css';
import { PlayerControl } from './PlayerControl';

export default function AppBar() {
  return (
    <header className={classes.header}>
      <PlayerControl />
    </header>
  );
}
