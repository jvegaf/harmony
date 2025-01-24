import React, { useRef } from 'react';
import styles from './Setting.module.css';

type Props = {
  children: React.ReactNode;
};

export function Section(props: Props) {
  return <section className={styles.settingSection}>{props.children}</section>;
}

export function Description(props: Props) {
  return <p className={styles.settingDescription}>{props.children}</p>;
}

export function Label(props: JSX.IntrinsicElements['label']) {
  const { children, ...restProps } = props;

  return (
    <label
      className={styles.settingLabel}
      {...restProps}
    >
      {children}
    </label>
  );
}

export function Title(props: Props) {
  return <span className={styles.settingTitle}>{props.children}</span>;
}

export function TextArea(props: JSX.IntrinsicElements['textarea']) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <textarea
      ref={ref}
      className={styles.settingInput}
      {...props}
    />
  );
}

export function Input(props: JSX.IntrinsicElements['input']) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      className={styles.settingInput}
      {...props}
    />
  );
}

export function Error(props: Props) {
  return <p className={styles.settingError}>{props.children}</p>;
}

export function Select(props: Props & JSX.IntrinsicElements['select']) {
  return (
    <select
      className={styles.settingSelect}
      {...props}
    >
      {props.children}
    </select>
  );
}
