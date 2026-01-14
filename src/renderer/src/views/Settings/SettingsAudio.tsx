import * as Setting from '../../components/Setting/Setting';
import AudioOutputSelect from '../../components/AudioOutputSelect/AudioOutputSelect';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './Settings.module.css';

import { Config } from '@preload/types/harmony';
import { NumberInput } from '@mantine/core';
import { useEffect, useState } from 'react';

type Props = {
  config: Config;
};

function SettingsAudio({ config }: Props) {
  const playerAPI = usePlayerAPI();
  const [positionValue, setPositionValue] = useState<number>(0);

  useEffect(() => {
    setPositionValue(config.audioPreCuePosition);
  }, []);

  return (
    <div className={styles.settingsContainer}>
      <Setting.Section>
        <Setting.Description>Audio output</Setting.Description>
        <Setting.Action>
          <AudioOutputSelect
            defaultValue={config.audioOutputDevice}
            onChange={playerAPI.setOutputDevice}
          />
        </Setting.Action>
      </Setting.Section>
      <Setting.Section>
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
      </Setting.Section>
    </div>
  );
}

export default SettingsAudio;
