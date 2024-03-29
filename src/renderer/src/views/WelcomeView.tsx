import Onboarding from '../components/Onboarding';
import classes from './WelcomeView.module.css';
import useLibraryStore from '../stores/useLibraryStore';

export function WelcomeView() {
  const onOpen = useLibraryStore(state => state.onOpen);

  return (
    <div className={classes.welcomeRoot}>
      <Onboarding openHandler={onOpen} />
    </div>
  );
}
