import { Container, Group } from "@mantine/core";
import classes from "./AppBar.module.css";

export default function AppBar() {
  return (
    <header className={classes.header}>
      <Container className={classes.inner}>
        <Group gap={5} justify="center" visibleFrom="xs">
          header
        </Group>
      </Container>
    </header>
  );
}
