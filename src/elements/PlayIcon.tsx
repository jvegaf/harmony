import classes from './PlayIcon.module.css';

export function PlayIcon() {
  return (
    <div className={classes.iconRoot}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <path d="M3 22v-20l18 10-18 10z" />
      </svg>
    </div>
  );
}
