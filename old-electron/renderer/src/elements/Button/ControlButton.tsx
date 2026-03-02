import styles from './ControlButton.module.css';

function ControlButton(props: JSX.IntrinsicElements['button']) {
  const { children, ...restProps } = props;
  return (
    <div>
      <button
        className={styles.ctrlBtn}
        {...restProps}
      >
        {children}
      </button>
    </div>
  );
}

export default ControlButton;
