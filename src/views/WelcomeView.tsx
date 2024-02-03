import { useEffect } from 'react';
import Onboarding from '../components/Onboarding';
import classes from './WelcomeView.module.css';
import { useNavigate } from 'react-router-dom';
import useLibraryStore from '../stores/useLibraryStore';

export function WelcomeView() {
  const openHandler = () => window.Main.OpenFolder();
  const tracks = useLibraryStore((state) => state.tracks);
  const navigate = useNavigate();

  useEffect(() => {
    if (tracks.length) {
      navigate('/');
    }
  }, [navigate, tracks]);

  return (
    <div className={classes.welcomeRoot}>
      <Onboarding openHandler={openHandler} />
    </div>
  );
}
