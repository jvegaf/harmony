import { useEffect, useRef } from 'react';
import { Modal, ScrollArea, Stack, Text, Loader, Button } from '@mantine/core';
import { IconExternalLink, IconMusic } from '@tabler/icons-react';
import { BeatportRecommendation } from '../../../../preload/types/harmony';
import styles from './BeatportRecommendationsModal.module.css';

const { shell } = window.Main;

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

  // AIDEV-NOTE: Stop any playing audio when modal closes
  useEffect(() => {
    if (!opened && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, [opened]);

  const handleOpenInBeatport = (trackId: number) => {
    // AIDEV-NOTE: Using /track/t/{id} as a slug-agnostic redirect that Beatport supports
    shell.openExternal(`https://www.beatport.com/track/t/${trackId}`);
  };

  // AIDEV-NOTE: Handle audio play event - pause previous audio if exists
  const handleAudioPlay = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const newAudio = event.currentTarget;

    // If there's a currently playing audio and it's different from the new one, pause it
    if (currentAudioRef.current && currentAudioRef.current !== newAudio) {
      currentAudioRef.current.pause();
    }

    // Update the reference to the new playing audio
    currentAudioRef.current = newAudio;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Beatport Recommendations'
      size='90%'
      centered
    >
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
          <Stack gap='sm'>
            {recommendations.map(track => (
              <div
                key={track.track_id}
                className={styles.trackCard}
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
                    <audio
                      controls
                      preload='none'
                      className={styles.audio}
                      onPlay={handleAudioPlay}
                    >
                      <source
                        src={track.sample_url}
                        type='audio/mpeg'
                      />
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
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Modal>
  );
}
