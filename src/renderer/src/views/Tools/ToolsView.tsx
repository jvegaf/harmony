import { useNavigate, useRevalidator } from 'react-router-dom';

import { LoaderData } from '../router';
import styles from './ToolsView.module.css';
import { Tabs } from '@mantine/core';
import Keybinding from 'react-keybinding-component';
import { IconLayersIntersect, IconPiano } from '@tabler/icons-react';
// import { RootLoaderData } from '../Root';
import DuplicateFinderTool from './DuplicateFinderTool';
import KeyAnalizerTool from './KeyAnalizerTool';

export default function ToolsView() {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  // const { appConfig } = useLoaderData() as SettingsLoaderData;
  // const { appConfig } = useRouteLoaderData('root') as RootLoaderData;

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
      <div className={styles.viewToolsRoot}>
        <Tabs
          defaultValue='duplicateFinder'
          orientation='vertical'
          variant='pills'
          radius='xs'
        >
          <Tabs.List>
            <Tabs.Tab
              value='duplicateFinder'
              leftSection={<IconLayersIntersect size={14} />}
            >
              Duplicate Finder
            </Tabs.Tab>
            <Tabs.Tab
              value='keyAnalyzer'
              leftSection={<IconPiano size={12} />}
            >
              Key Analizer
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='duplicateFinder'>
            <DuplicateFinderTool />
          </Tabs.Panel>
          <Tabs.Panel value='keyAnalyzer'>
            <KeyAnalizerTool />
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}

export type ToolsLoaderData = LoaderData<typeof ToolsView.loader>;

ToolsView.loader = async () => {
  return {};
  // return {
  //   appConfig: await config.getAll(),
  // };
};
