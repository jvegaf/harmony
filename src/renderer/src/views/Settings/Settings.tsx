import { useNavigate, useRevalidator, useRouteLoaderData } from 'react-router-dom';

import { LoaderData } from '../router';
import styles from './Settings.module.css';
import { ActionIcon, Tabs } from '@mantine/core';
import Keybinding from 'react-keybinding-component';
import SettingsLibrary from './SettingsLibrary';
import SettingsAudio from './SettingsAudio';
import SettingsTraktor from './SettingsTraktor';
import SettingsGeneral from './SettingsGeneral';
import { IconDeviceSpeaker, IconPencilCog, IconVinyl, IconDisc, IconSettings } from '@tabler/icons-react';
import { MdArrowBack } from 'react-icons/md';
import SettingsLog from './SettingsLog';
import { RootLoaderData } from '../Root';

export default function SettingsView() {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  // const { appConfig } = useLoaderData() as SettingsLoaderData;
  const { appConfig } = useRouteLoaderData('root') as RootLoaderData;

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
          defaultValue='general'
          // orientation='vertical'
          variant='pills'
          radius='xs'
        >
          <Tabs.List classNames={styles}>
            <Tabs.Tab
              value='general'
              leftSection={<IconSettings size={14} />}
            >
              General
            </Tabs.Tab>
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
            <Tabs.Tab
              value='logs'
              leftSection={<IconPencilCog size={14} />}
            >
              Logs
            </Tabs.Tab>
            <Tabs.Tab
              value='traktor'
              leftSection={<IconDisc size={14} />}
            >
              Traktor
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='general'>
            <SettingsGeneral />
          </Tabs.Panel>
          <Tabs.Panel value='library'>
            <SettingsLibrary />
          </Tabs.Panel>
          <Tabs.Panel value='audio'>
            <SettingsAudio config={appConfig} />
          </Tabs.Panel>
          <Tabs.Panel value='logs'>
            <SettingsLog />
          </Tabs.Panel>
          <Tabs.Panel value='traktor'>
            <SettingsTraktor />
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}

export type SettingsLoaderData = LoaderData<typeof SettingsView.loader>;

SettingsView.loader = async () => {
  return {};
  // return {
  //   appConfig: await config.getAll(),
  // };
};
