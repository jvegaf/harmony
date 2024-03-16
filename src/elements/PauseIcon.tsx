import classes from './PlayIcon.module.css';

export function PauseIcon() {
  return (
    <div className={classes.iconRoot}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="24"
        viewBox="0 0 24 24"
      >
        <path d="M10 24h-10v-24h8v24zm10-24h-6v24h8v-24z" />
      </svg>
    </div>
  );
}
