import AppBar from "../components/AppBar";
import { Outlet } from "react-router-dom";
import classes from "./Layout.module.css";

export function RootLayout() {
  return (
    <div className={classes.rlayout}>
      <AppBar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
