import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Group, Modal, ScrollArea, Stack, Text, Loader, Button, Tooltip } from '@mantine/core';
import {
  IconExternalLink,
  IconMusic,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-react';
import { BeatportRecommendation } from '@/types/harmony';
import styles from './BeatportRecommendationsModal.module.css';
import { shell } from '@/lib/tauri-api';

interface BeatportRecommendationsModalProps {
  opened: boolean;
  onClose: () => void;
  recommendations: BeatportRecommendation[];
  loading: boolean;
}

// AIDEV-NOTE: Replace {w}x{h} placeholder in Beatport image URLs with actual dimensions
const getImageUrl = (url: string, width: number, height: number): string => {
  return url.replace('{w}x{h}', `${width}x${height}`);
};

// AIDEV-NOTE: Format ISO date string to DD/MM/YYYY
const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function BeatportRecommendationsModal({
  opened,
  onClose,
  recommendations,
  loading,
}: BeatportRecommendationsModalProps) {
  // AIDEV-NOTE: Track currently playing audio element to ensure only one plays at a time
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // AIDEV-NOTE: Refs array to imperatively control each <audio> element in playlist mode
  const audioRefsMap = useRef<Map<number, HTMLAudioElement>>(new Map());
  // AIDEV-NOTE: Index of the track currently highlighted/playing in playlist mode; null = no playlist active
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  // AIDEV-NOTE: Whether the playlist is actively running (Play All was pressed and not stopped)
  const [isPlaylistActive, setIsPlaylistActive] = useState(false);

  // AIDEV-NOTE: Stop any playing audio when modal closes and reset playlist state
  useEffect(() => {
    if (!opened) {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      setPlayingIndex(null);
      setIsPlaylistActive(false);
    }
  }, [opened]);

  // AIDEV-NOTE: Advance to the next track with a sample; stops playlist when exhausted
  const advanceToNext = useCallback(
    (currentIdx: number) => {
      const next = currentIdx + 1;
      if (next < recommendations.length) {
        setPlayingIndex(next);
      } else {
        setIsPlaylistActive(false);
        setPlayingIndex(null);
        currentAudioRef.current = null;
      }
    },
    [recommendations.length],
  );

  // AIDEV-NOTE: When playingIndex changes in playlist mode, start playback for that track
  useEffect(() => {
    if (!isPlaylistActive || playingIndex === null) return;

    const trackId = recommendations[playingIndex]?.track_id;
    if (trackId === undefined) return;

    const audio = audioRefsMap.current.get(trackId);
    if (!audio) return;

    // Pause whatever was playing before
    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    currentAudioRef.current = audio;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // If playback fails (e.g. no sample_url), advance to next track
      advanceToNext(playingIndex);
    });
  }, [playingIndex, isPlaylistActive, recommendations, advanceToNext]);

  const handlePlayAll = () => {
    if (isPlaylistActive) {
      // Pause playlist - keep playingIndex so resume is possible
      currentAudioRef.current?.pause();
      setIsPlaylistActive(false);
      return;
    }

    // Resume from current position if one exists, otherwise start from first track with sample
    const startIndex = playingIndex ?? recommendations.findIndex(t => t.sample_url);
    if (startIndex === -1) return;

    setIsPlaylistActive(true);
    setPlayingIndex(startIndex);
  };

  const handleSkipPrev = () => {
    const from = playingIndex ?? 0;
    const prev = from - 1;
    if (prev < 0) return;
    setPlayingIndex(prev);
    if (!isPlaylistActive) setIsPlaylistActive(true);
  };

  const handleSkipNext = () => {
    const from = playingIndex ?? -1;
    const next = from + 1;
    if (next >= recommendations.length) return;
    setPlayingIndex(next);
    if (!isPlaylistActive) setIsPlaylistActive(true);
  };

  const handleOpenInBeatport = (trackId: number) => {
    // AIDEV-NOTE: Using /track/t/{id} as a slug-agnostic redirect that Beatport supports
    shell.openExternal(`https://www.beatport.com/track/t/${trackId}`);
  };

  // AIDEV-NOTE: Handle audio play event - pause previous audio if exists and sync highlight
  const handleAudioPlay = (event: React.SyntheticEvent<HTMLAudioElement>, index: number) => {
    const newAudio = event.currentTarget;

    // If there's a currently playing audio and it's different from the new one, pause it
    if (currentAudioRef.current && currentAudioRef.current !== newAudio) {
      currentAudioRef.current.pause();
    }

    currentAudioRef.current = newAudio;
    // Sync highlight to whichever track the user manually played
    setPlayingIndex(index);
  };

  // AIDEV-NOTE: When a track's audio ends, clear highlight (or let playlist advance)
  const handleAudioEnded = (index: number) => {
    if (isPlaylistActive) {
      advanceToNext(index);
    } else {
      setPlayingIndex(null);
      currentAudioRef.current = null;
    }
  };

  // AIDEV-NOTE: When a track's audio is paused by the user, clear highlight if not in playlist mode
  const handleAudioPause = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    // Only clear if the pause wasn't triggered programmatically (i.e. the audio is still current)
    if (!isPlaylistActive && currentAudioRef.current === audio) {
      setPlayingIndex(null);
    }
  };

  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      size='90%'
      centered
    >
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Beatport Recommendations</Modal.Title>
          {!loading && recommendations.some(t => t.sample_url) && (
            <Group
              gap={12}
              style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
            >
              <Tooltip label='Previous track'>
                <ActionIcon
                  variant='subtle'
                  size='md'
                  onClick={handleSkipPrev}
                  disabled={playingIndex === null || playingIndex <= 0}
                  aria-label='Previous track'
                  radius='xl'
                >
                  <IconPlayerSkipBack size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={isPlaylistActive ? 'Pause playlist' : 'Play all samples'}>
                <ActionIcon
                  variant={isPlaylistActive ? 'filled' : 'light'}
                  color={isPlaylistActive ? 'orange' : 'green'}
                  size='xl'
                  onClick={handlePlayAll}
                  radius='xl'
                  aria-label={isPlaylistActive ? 'Pause playlist' : 'Play all samples'}
                >
                  {isPlaylistActive ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Next track'>
                <ActionIcon
                  variant='subtle'
                  size='md'
                  onClick={handleSkipNext}
                  disabled={playingIndex === null || playingIndex >= recommendations.length - 1}
                  aria-label='Next track'
                  radius='xl'
                >
                  <IconPlayerSkipForward size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <Stack
              align='center'
              justify='center'
              py='xl'
            >
              <Loader size='lg' />
              <Text c='dimmed'>Finding similar tracks...</Text>
            </Stack>
          ) : recommendations.length === 0 ? (
            <Stack
              align='center'
              justify='center'
              py='sm'
            >
              <IconMusic
                size={48}
                stroke={1.5}
                opacity={0.5}
              />
              <Text c='dimmed'>No recommendations found</Text>
            </Stack>
          ) : (
            <ScrollArea
              h='calc(100vh - 180px)'
              type='auto'
            >
              <Stack gap={0}>
                {recommendations.map((track, index) => {
                  const isPlaying = playingIndex === index;
                  return (
                    <div
                      key={track.track_id}
                      className={`${styles.trackCard}${isPlaying ? ` ${styles.trackCardPlaying}` : ''}`}
                    >
                      <div className={styles.trackArtwork}>
                        <img
                          src={getImageUrl(track.release.image_url, 40, 40)}
                          alt={track.release.name}
                          className={styles.artworkImage}
                        />
                      </div>
                      <div className={styles.trackInfo}>
                        <Text
                          fw={600}
                          size='sm'
                          className={styles.trackTitle}
                        >
                          {track.track_name}
                          {track.mix_name && track.mix_name !== 'Original Mix' && (
                            <Text
                              span
                              fw={400}
                              c='dimmed'
                            >
                              {' '}
                              ({track.mix_name})
                            </Text>
                          )}
                        </Text>
                        <Text
                          size='xs'
                          c='dimmed'
                          className={styles.trackArtists}
                        >
                          {track.artists.map(a => a.name).join(', ')}
                        </Text>
                      </div>
                      {track.sample_url && (
                        <div className={styles.audioPlayer}>
                          {/* AIDEV-NOTE: ref callback registers each audio element by track_id for playlist control */}
                          <audio
                            ref={el => {
                              if (el) audioRefsMap.current.set(track.track_id, el);
                              else audioRefsMap.current.delete(track.track_id);
                            }}
                            controls
                            preload='none'
                            className={styles.audio}
                            onPlay={e => handleAudioPlay(e, index)}
                            onEnded={() => handleAudioEnded(index)}
                            onPause={handleAudioPause}
                          >
                            <source
                              src={track.sample_url}
                              type='audio/mpeg'
                            />
                            {/* AIDEV-NOTE: Empty captions track required for a11y lint rule */}
                            <track kind='captions' />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      <div className={styles.trackGenre}>
                        <Text
                          size='xs'
                          c='dimmed'
                        >
                          Genre
                        </Text>
                        <Text size='sm'>{track.genre.name}</Text>
                      </div>
                      <div className={styles.trackLabel}>
                        <Text
                          size='xs'
                          c='dimmed'
                        >
                          Label
                        </Text>
                        <Text size='sm'>{track.label.name}</Text>
                      </div>
                      <div className={styles.trackBpm}>
                        <Text
                          size='xs'
                          c='dimmed'
                        >
                          BPM
                        </Text>
                        <Text size='sm'>{track.bpm}</Text>
                      </div>
                      <div className={styles.trackRelease}>
                        <Text
                          size='xs'
                          c='dimmed'
                        >
                          Release Date
                        </Text>
                        <Text size='sm'>{formatDate(track.release.release_date)}</Text>
                      </div>
                      <Button
                        variant='light'
                        size='sm'
                        leftSection={<IconExternalLink size={16} />}
                        onClick={() => handleOpenInBeatport(track.track_id)}
                        className={styles.openButton}
                      >
                        Open in Beatport
                      </Button>
                    </div>
                  );
                })}
              </Stack>
            </ScrollArea>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
