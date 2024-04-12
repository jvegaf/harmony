import { useState, useEffect } from 'react';
import usePlayerStore from '../stores/usePlayerStore';
import useLibraryStore from '../stores/useLibraryStore';
import classes from './PlayerControl.module.css';
import { PlayIcon } from '../elements/PlayIcon';
import { PauseIcon } from '../elements/PauseIcon';
import { PrevIcon } from '../elements/PrevIcon';
import { NextIcon } from '../elements/NextIcon';
import TrackProgress from './TrackProgress';
import { Track } from '@preload/emusik';
import { PlayerStatus } from '@preload/emusik-player';
import { Image } from '@mantine/core';
import useAppStore from '@renderer/stores/useAppStore';
import PlaceHolder from '../assets/placeholder.png';

export function PlayerControl() {
  const getTrackFromId = useLibraryStore(state => state.getTrackFromId);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const playerStatus = usePlayerStore(state => state.playerStatus);
  const togglePlayPause = usePlayerStore(state => state.api.togglePlayPause);
  const appBarHeight = useAppStore(state => state.appBarHeight);
  const getArtImage = useAppStore(state => state.getArtImage);
  const [trackPlaying, setTrackPlaying] = useState<Track | null>(null);
  const [artSrc, setArtSrc] = useState<string | null>(null);

  const setArtwork = async (track: Track) => {
    const artImage = await getArtImage(track);
    if (artImage === null) {
      setArtSrc(null);
      return;
    }
    console.log(artImage.mime);
    console.log(artImage.imageBuffer.length);
    const blob = new Blob([artImage.imageBuffer], { type: artImage.mime });

    const src = URL.createObjectURL(blob);
    setArtSrc(src);
  };

  useEffect(() => {
    if (playingTrack.length) {
      const track = getTrackFromId(playingTrack);
      if (!track) return;
      setTrackPlaying(track);
      setArtwork(track);
    }
  }, [playingTrack]);

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerControls}>
        <button
          className={classes.playerButton}
          // onClick={() => togglePlayPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          <PrevIcon />
        </button>
        <button
          className={classes.playerButton}
          onClick={() => togglePlayPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          {playerStatus === PlayerStatus.PLAY ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className={classes.playerButton}
          // onClick={() => togglePlayPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          <NextIcon />
        </button>
      </div>

      <div className={classes.playerInfo}>
        <Image
          src={artSrc}
          h={appBarHeight}
          fallbackSrc={PlaceHolder}
        />
        <div className={classes.infoBox}>
          {trackPlaying && (
            <>
              <div className={classes.playerInfoTitle}>{trackPlaying.title}</div>
              <div className={classes.playerInfoArtist}>{trackPlaying?.artist}</div>
              <div className={classes.playerProgress}>
                <TrackProgress trackPlaying={trackPlaying} />
              </div>
            </>
          )}
        </div>
      </div>
      <div className={classes.playerSearch}>Search</div>
    </div>
  );
}
