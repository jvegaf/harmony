
import { createStyles } from '@mantine/core';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from 'renderer/hooks';
import AppHeader from '../components/AppHeader';
import OnBoarding from '../components/OnBoarding';

const useStyles = createStyles((theme) => ({
  main: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white
  },
  header: { height: 70 },
  content: { flexGrow: 1 }
}));

const WelcomeView = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const tracks = useAppSelector((state) => state.collection.tracks);

  React.useEffect(() => {
    if (tracks.length ) {
      navigate('/');
    }
  }, [tracks]);

  return (
    <>
        <div className={classes.header}>
          <AppHeader />
        </div>
        <div className={classes.content}>
          <OnBoarding />
        </div>
    </>
  );
};

export default WelcomeView;