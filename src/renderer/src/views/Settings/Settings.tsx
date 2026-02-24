import { useNavigate, useRevalidator, useRouteLoaderData } from 'react-router-dom';

import { LoaderData } from '../router';
import styles from './Settings.module.css';
import { Tabs } from '@mantine/core';
import Keybinding from 'react-keybinding-component';
import SettingsLibrary from './SettingsLibrary';
import SettingsAudio from './SettingsAudio';
import SettingsTraktor from './SettingsTraktor';
import SettingsGeneral from './SettingsGeneral';
import SettingsUI from './SettingsUI';
import {
  IconDeviceSpeaker,
  IconPencilCog,
  IconVinyl,
  IconDisc,
  IconSettings,
  IconLayersIntersect,
  IconPalette,
  IconTag,
} from '@tabler/icons-react';
import SettingsLog from './SettingsLog';
import SettingsDuplicates from './SettingsDuplicates';
import SettingsTagger from './SettingsTagger';
import { RootLoaderData } from '../Root';

export default function SettingsView() {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  // const { appConfig } = useLoaderData() as SettingsLoaderData;
  const { appConfig } = useRouteLoaderData('root') as RootLoaderData;

  const onCloseListener = () => {
    revalidator.revalidate();
    navigate('/library');
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
        <Tabs
          defaultValue='library'
          orientation='vertical'
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
              value='appearance'
              leftSection={<IconPalette size={14} />}
            >
              Appearance
            </Tabs.Tab>
            <Tabs.Tab
              value='general'
              leftSection={<IconSettings size={14} />}
            >
              General
            </Tabs.Tab>
            <Tabs.Tab
              value='audio'
              leftSection={<IconDeviceSpeaker size={14} />}
            >
              Audio
            </Tabs.Tab>
            <Tabs.Tab
              value='traktor'
              leftSection={<IconDisc size={14} />}
            >
              Traktor
            </Tabs.Tab>
            <Tabs.Tab
              value='duplicates'
              leftSection={<IconLayersIntersect size={14} />}
            >
              Duplicates
            </Tabs.Tab>
            <Tabs.Tab
              value='tagger'
              leftSection={<IconTag size={14} />}
            >
              Tagger
            </Tabs.Tab>
            <Tabs.Tab
              value='logs'
              leftSection={<IconPencilCog size={14} />}
            >
              Logs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='library'>
            <SettingsLibrary />
          </Tabs.Panel>
          <Tabs.Panel value='appearance'>
            <SettingsUI />
          </Tabs.Panel>
          <Tabs.Panel value='general'>
            <SettingsGeneral />
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
          <Tabs.Panel value='duplicates'>
            <SettingsDuplicates />
          </Tabs.Panel>
          <Tabs.Panel value='tagger'>
            <SettingsTagger />
          </Tabs.Panel>
          <Tabs.Panel value='logs'>
            <SettingsLog />
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
