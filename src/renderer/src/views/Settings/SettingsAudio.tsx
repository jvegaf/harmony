import * as Setting from '../../components/Setting/Setting';
import AudioOutputSelect from '../../components/AudioOutputSelect/AudioOutputSelect';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './Settings.module.css';

import { Config } from '@renderer/types/harmony';
import { NumberInput, Stack } from '@mantine/core';
import { useEffect, useState } from 'react';
import { config as tauriConfig } from '@renderer/lib/tauri-api';

type Props = {
  config: Config;
};

function SettingsAudio({ config }: Props) {
  const playerAPI = usePlayerAPI();
  const [positionValue, setPositionValue] = useState<number>(0);
  const [workersValue, setWorkersValue] = useState<number>(0);

  useEffect(() => {
    setPositionValue(config.audioPreCuePosition);
    setWorkersValue(config.audioAnalysisWorkers || 4);
  }, [config]);

  return (
    <div className={styles.settingsContainer}>
      <Stack
        gap='lg'
        mt='md'
      >
        <Setting.Element>
          <Setting.Description>Audio output</Setting.Description>
          <Setting.Action>
            <AudioOutputSelect
              defaultValue={config.audioOutputDevice}
              onChange={playerAPI.setOutputDevice}
            />
          </Setting.Action>
        </Setting.Element>
        <Setting.Element>
          <Setting.Description>PreCue position</Setting.Description>
          <Setting.Action>
            <NumberInput
              allowNegative={false}
              step={10}
              value={positionValue}
              onChange={value => {
                if (value !== null) {
                  if (typeof value === 'string') {
                    value = Number.parseInt(value);
                  }
                  setPositionValue(value);
                  playerAPI.setAudioPreCuePosition(value);
                }
              }}
            />
          </Setting.Action>
        </Setting.Element>
        <Setting.Element>
          <Setting.Description>Audio Analysis Workers (1-16)</Setting.Description>
          <Setting.Action>
            <NumberInput
              allowNegative={false}
              min={1}
              max={16}
              step={1}
              value={workersValue}
              onChange={value => {
                if (value !== null) {
                  if (typeof value === 'string') {
                    value = Number.parseInt(value);
                  }
                  // Clamp between 1 and 16
                  const clampedValue = Math.max(1, Math.min(16, value));
                  setWorkersValue(clampedValue);
                  tauriConfig.set('audioAnalysisWorkers', clampedValue);
                }
              }}
            />
          </Setting.Action>
        </Setting.Element>
      </Stack>
    </div>
  );
}

export default SettingsAudio;
