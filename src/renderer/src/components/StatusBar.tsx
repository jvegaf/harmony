import { FC } from 'react';
import classes from './StatusBar.module.css';
import useAppStore from '@renderer/stores/useAppStore';

export const StatusBar: FC = () => {
  const message = useAppStore(state => state.statusBarMessage);
  return <div className={classes.statusBarRoot}>{message}</div>;
};
