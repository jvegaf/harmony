import { useNavigate, useRevalidator, useLoaderData } from 'react-router-dom';

import { LoaderData } from '../router';
import styles from './Settings.module.css';
import { ActionIcon, Tabs } from '@mantine/core';
import Keybinding from 'react-keybinding-component';
import SettingsLibrary from './SettingsLibrary';
import SettingsAudio from './SettingsAudio';
import { IconDeviceSpeaker, IconVinyl } from '@tabler/icons-react';
import { MdArrowBack } from 'react-icons/md';

const { config } = window.Main;

export default function SettingsView() {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { appConfig } = useLoaderData() as SettingsLoaderData;

  const onCloseListener = () => {
    revalidator.revalidate();
    navigate('/');
  };

  return (
    <>
      <Keybinding
        onKey={e => {
          if (e.key === 'Escape') {
            onCloseListener();
          }
        }}
        preventInputConflict
      />
      <div className={styles.viewSettings}>
        <div className={styles.header}>
          <ActionIcon
            variant='subtle'
            onClick={onCloseListener}
          >
            <MdArrowBack size='3em' />
          </ActionIcon>
        </div>
        <Tabs
          defaultValue='library'
          // orientation='vertical'
          variant='pills'
          radius='xs'
        >
          <Tabs.List classNames={styles}>
            <Tabs.Tab
              value='library'
              leftSection={<IconVinyl size={12} />}
            >
              Library
            </Tabs.Tab>
            <Tabs.Tab
              value='audio'
              leftSection={<IconDeviceSpeaker size={14} />}
            >
              Audio
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='library'>
            <SettingsLibrary />
          </Tabs.Panel>
          <Tabs.Panel value='audio'>
            <SettingsAudio config={appConfig} />
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}

export type SettingsLoaderData = LoaderData<typeof SettingsView.loader>;

SettingsView.loader = async () => {
  return {
    appConfig: await config.getAll(),
  };
};
