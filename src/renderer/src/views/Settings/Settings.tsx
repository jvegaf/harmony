import { Outlet, useMatch, Navigate, useNavigate, useRevalidator } from 'react-router-dom';

import * as Nav from '../../elements/Nav/Nav';

import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Settings.module.css';
import { Button } from '@mantine/core';

export default function SettingsView() {
  const match = useMatch('/settings');
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const onCloseListener = () => {
    revalidator.revalidate();
    navigate('/');
  };

  return (
    <div className={`${appStyles.view} ${styles.viewSettings}`}>
      <div className={styles.settings__nav}>
        <Nav.Wrap vertical>
          <Nav.Link to='/settings/library'>Library</Nav.Link>
        </Nav.Wrap>
      </div>

      <div className={styles.rootSettings}>
        <div className={styles.settings__content}>
          <Outlet />
        </div>
        <div className={styles.settingsBtns}>
          <Button onClick={() => onCloseListener()}>Close</Button>
        </div>
      </div>

      {match && <Navigate to='/settings/library' />}
    </div>
  );
}

export type SettingsLoaderData = LoaderData<typeof SettingsView.loader>;

SettingsView.loader = async () => {
  // const config = await window.HarmonyAPI.config.getAll();

  // return {
  // config,
  // };
  return null;
};
