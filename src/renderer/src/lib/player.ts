import { Track } from '../../../preload/types/harmony';

interface PlayerOptions {
  playbackRate?: number;
  audioOutputDevice?: string;
  volume?: number;
  muted?: boolean;
}

class Player {
  private audio: HTMLAudioElement;
  private durationThresholdReached: boolean;
  private track: Track | null;
  public threshold: number;

  constructor(options?: PlayerOptions) {
    const mergedOptions = {
      playbackRate: 1,
      volume: 1,
      muted: false,
      audioOutputDevice: 'default',
      ...options,
    };

    this.audio = new Audio();
    this.track = null;

    this.audio.defaultPlaybackRate = mergedOptions.playbackRate;
    // eslint-disable-next-line
    // @ts-ignore
    this.audio.setSinkId(mergedOptions.audioOutputDevice);
    this.audio.playbackRate = mergedOptions.playbackRate;
    this.audio.volume = mergedOptions.volume;
    this.audio.muted = mergedOptions.muted;

    this.threshold = 0.75;
    this.durationThresholdReached = false;
  }

  async play() {
    if (!this.audio.src) throw new Error('Trying to play a track but not audio.src is defined');

    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
  }

  mute() {
    this.audio.muted = true;
  }

  unmute() {
    this.audio.muted = false;
  }

  getAudio() {
    return this.audio;
  }

  getCurrentTime() {
    return this.audio.currentTime;
  }

  getVolume() {
    return this.audio.volume;
  }

  setVolume(volume: number) {
    this.audio.volume = volume;
  }

  setPlaybackRate(playbackRate: number) {
    this.audio.playbackRate = playbackRate;
    this.audio.defaultPlaybackRate = playbackRate;
  }

  async setOutputDevice(deviceID: string) {
    // eslint-disable-next-line
    // @ts-ignore
    await this.audio.setSinkId(deviceID);
  }

  getTrack() {
    return this.track;
  }

  setTrack(track: Track) {
    this.track = track;
    this.audio.src = window.Main.library.parseUri(track.path);

    // When we change song, need to update the thresholdReached indicator.
    this.durationThresholdReached = false;
  }

  setCurrentTime(currentTime: number) {
    this.audio.currentTime = currentTime;
  }

  isMuted() {
    return this.audio.muted;
  }

  isPaused() {
    return this.audio.paused;
  }

  isThresholdReached() {
    if (!this.durationThresholdReached && this.audio.currentTime >= this.audio.duration * this.threshold) {
      this.durationThresholdReached = true;
    }

    return this.durationThresholdReached;
  }
}

/**
 * Export a singleton by default, for the sake of simplicity (and we only need
 * one anyway)
 */

const { config } = window.Main;

export default new Player({
  volume: config.__initialConfig['audioVolume'],
  audioOutputDevice: config.__initialConfig['audioOutputDevice'],
  muted: config.__initialConfig['audioMuted'],
});
