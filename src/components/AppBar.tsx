import {Container} from '@mantine/core';
import classes from './AppBar.module.css';

export default function AppBar() {
  return (
    <header className={classes.header}>
      <Container className={classes.inner}>header</Container>
    </header>
  );
}
