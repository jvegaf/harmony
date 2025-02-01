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
      <Setting.Title>Audio</Setting.Title>
      <Setting.Section>
        <Setting.Label htmlFor='setting-playbackrate'>Audio output</Setting.Label>
        <AudioOutputSelect
          defaultValue={config.audioOutputDevice}
          onChange={playerAPI.setOutputDevice}
        />
        <Setting.Description>Advanced: set a custom audio output device.</Setting.Description>
      </Setting.Section>
    </div>
  );
}

export default SettingsAudio;
