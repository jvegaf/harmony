import classes from './PlayIcon.module.css';

export function PrevIcon() {
  return (
    <div className={classes.iconRoot}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
      >
        <path d='M12 12l12-7v14l-12-7zm-12 0l12-7v14l-12-7z' />
      </svg>
    </div>
  );
}
