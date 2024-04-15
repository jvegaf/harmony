import Onboarding from '../components/Onboarding';
import classes from './WelcomeView.module.css';
import useLibraryStore from '../stores/useLibraryStore';

export function WelcomeView() {
  const onOpen = useLibraryStore(state => state.onOpen);
  const onDrag = useLibraryStore(state => state.onDrag);

  return (
    <div className={classes.welcomeRoot}>
      <Onboarding
        openHandler={onOpen}
        dragHandler={onDrag}
      />
    </div>
  );
}
