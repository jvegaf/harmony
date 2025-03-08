import * as Setting from '../../components/Setting/Setting';
import AudioOutputSelect from '../../components/AudioOutputSelect/AudioOutputSelect';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './Settings.module.css';

import { Config } from 'src/preload/types/harmony';

type Props = {
  config: Config;
};

function SettingsAudio({ config }: Props) {
  const playerAPI = usePlayerAPI();

  return (
    <div className={styles.settingsContainer}>
      {/* <Setting.Title>Audio</Setting.Title> */}
      <Setting.Section>
        <Setting.Description>Audio output</Setting.Description>
        <Setting.Action>
          <AudioOutputSelect
            defaultValue={config.audioOutputDevice}
            onChange={playerAPI.setOutputDevice}
          />
        </Setting.Action>
      </Setting.Section>
    </div>
  );
}

export default SettingsAudio;
