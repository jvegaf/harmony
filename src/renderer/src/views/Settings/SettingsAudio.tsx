import { useLoaderData } from 'react-router-dom';

import * as Setting from '../../components/Setting/Setting';
import AudioOutputSelect from '../../components/AudioOutputSelect/AudioOutputSelect';
import { usePlayerAPI } from '../../stores/usePlayerStore';

import { SettingsLoaderData } from './Settings';

export default function SettingsAudio() {
  const { config } = useLoaderData() as SettingsLoaderData;
  const playerAPI = usePlayerAPI();

  return (
    <div className='setting setting-audio'>
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
