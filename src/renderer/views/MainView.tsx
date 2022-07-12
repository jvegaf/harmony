import { createStyles } from "@mantine/core";
import React from "react";
import useAppState from "renderer/hooks/useAppState";
import AppHeader from '../components/AppHeader';
import OnBoarding from '../components/OnBoarding';
import TrackDetail from '../components/TrackDetail';
import { TrackList } from '../components/TrackList';

const useStyles = createStyles((theme) => ({
  main: {
    width:           "100%",
    height:          "100vh",
    display:         "flex",
    flexDirection:   "column",
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white
  },
  header:  { height: 100 },
  content: { flexGrow: 1 }
}));

const MainView = () => {
  const { classes } = useStyles();
  const {
    tracksLoaded, setTracksLoaded, trackDetail 
  } = useAppState();
  const [ content, setContent ] = React.useState(<OnBoarding />);

  React.useEffect(() => {
    window.Main.on("tracks-updated", () => {
      setTracksLoaded(true);
      window.Main.GetAll();
    });
  }, [ setTracksLoaded ]);

  React.useEffect(() => {
    if(tracksLoaded){
      setContent(<TrackList />);
    }

    if(trackDetail){
      const track = window.Main.GetTrack(trackDetail);
      setContent(<TrackDetail track={track} />);
    }
  }, [ tracksLoaded, trackDetail, setTracksLoaded ]);

  return (
    <div className={classes.main}>
      <div className={classes.header}>
        <AppHeader />
      </div>
      <div className={classes.content}>{content}</div>
    </div>
  );
};

export default MainView;
