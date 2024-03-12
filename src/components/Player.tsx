import {useState, useEffect} from 'react';
import {Howler} from 'howler';
import usePlayerStore from '../stores/usePlayerStore';
import classes from './Player.module.css';

export function Player() {
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setIsPlaying = usePlayerStore(state => state.setIsPlaying);
  const [selectedMusic, setSelectedMusic] = useState<Howl | null>(null);

  const [currentTime, setCurrentTime] = useState<any>();

  console.log('current time type is: ', typeof currentTime);

  function togglePlay() {
    if (!playingTrack) return;

    if (isPlaying) {
      selectedMusic.pause();
      setIsPlaying(false);
    } else {
      selectedMusic.play();
      setIsPlaying(true);
    }
  }

  //Howler.volume is a global volume controller for all the howl in project
  function handleVolumeChange(e: any) {
    Howler.volume(parseInt(e.target.value, 10) / 100);
  }

  // it resets the range button to the beginning when the music is changed NOT the current but the actual Music
  // and commit the action if the music exist in state
  useEffect(() => {
    setCurrentTime(0);
    if (selectedMusic) selectedMusic.seek(0);
  }, [selectedMusic]);

  useEffect(() => {
    if (playingTrack) {
      setSelectedMusic(
        new Howl({
          src: [playingTrack.path],
          autoplay: true,
        }),
      );
    }
  }, [playingTrack]);

  //this function get the value of input:range which is parsed value of currentTime
  function handleSeekChange(e: any) {
    let seekTime = 0;
    seekTime = parseInt(e.target.value, 10);
    // setCurrentTime is set to seekTime to control the value of input:range_seek
    setCurrentTime(seekTime);
    //the reason I have used seekTime instead of currentTime is that the currentime is an async state so the music should be pause and resume
    //to make the input:range_seek to work
    selectedMusic?.seek(seekTime);
  }

  //this useEffect sets an Interval for each 1sec and update the value of the
  useEffect(() => {
    let timerInterval: any;
    if (selectedMusic) {
      const updaterTimer = () => {
        const seekTimer = Math.round(selectedMusic.seek());
        setCurrentTime(seekTimer);
      };
      //The return value of setInterval is a unique identifier for the timer,
      //which is stored in the timerInterval variable in this case.
      // This identifier can be used later with the clearInterval function to stop the recurring timer.
      timerInterval = setInterval(updaterTimer, 1000);
    }
    return () => {
      clearInterval(timerInterval);
    };
  }, [selectedMusic]);

  //takes the timeInSeconds Value and convertss it into the timer format
  function formatTime(timeInSeconds: number) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  }
  const formattedTime = formatTime(currentTime);

  console.log('formattedTime type is :', typeof formattedTime);

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerControls}>
        <button
          className={classes.playerButton}
          onClick={togglePlay}
          disabled={!playingTrack}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className={classes.playerInfo}>
        <div className={classes.playerInfoTitle}>{playingTrack?.title}</div>
        <div className={classes.playerInfoArtist}>{playingTrack?.artist}</div>
        <div className={classes.playerInfoAlbum}>{playingTrack?.album}</div>
        <div className={classes.playerInfoTime}>{formattedTime}</div>
      </div>
      <div className={classes.playerSearch}>Search</div>
    </div>
  );
}
