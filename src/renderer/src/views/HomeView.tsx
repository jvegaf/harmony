import { TrackList } from '../components/TrackList';
import classes from './HomeView.module.css';

export function HomeView() {
  return (
    <div className={classes.homeview_container}>
      <TrackList />
    </div>
  );
}
