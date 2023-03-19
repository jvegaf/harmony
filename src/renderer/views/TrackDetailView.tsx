import { Button, Center, Container, Grid, Group, Image, Space, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useLog from 'renderer/hooks/useLog';
import Placeholder from '../../../assets/placeholder.png';
import type { ArtsTrackDTO, Track } from '../../shared/types/emusik';
import useAppState from '../hooks/useAppState';
import styles from './TrackDetailView.module.css';
interface TrackDetailProps {
  track: Track;
}

const TrackDetail: React.FC<TrackDetailProps> = ({ track }) => {
  const { saveChanges, setArtsFetched } = useAppState();
  const navigate = useNavigate();
  const log = useLog();

  const form = useForm({
    initialValues: {
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre,
      bpm: track.bpm,
      key: track.key,
      year: track.year,
      artwork: track.artwork,
    },
  });
  const [srcData, setSrcData] = React.useState(Placeholder);

  React.useEffect(() => {
    const { artwork } = track;

    if (artwork) {
      // eslint-disable-next-line no-undef
      const blob = new Blob([artwork.imageBuffer], { type: artwork.mime });

      const src = URL.createObjectURL(blob);
      setSrcData(src);
    }

    return () => setSrcData(Placeholder);
  }, [track]);

  const onCancel = () => navigate('/');

  const onSave = (values) => {
    saveChanges({ ...track, ...values });
    navigate('/');
  };

  const onFindArtworkListener = async () => {
    const arts = await window.Main.FindArtWork(track);
    if (arts.length) {
      const artsDto: ArtsTrackDTO = {
        reqTrack: track,
        artsUrls: arts,
      };
      setArtsFetched(artsDto);
      navigate('/arts');
    }
    log.info('no arts founded');
  };

  return (
    <Container size="sm" style={{ marginTop: 50 }}>
      <form onSubmit={form.onSubmit((values) => onSave(values))}>
        <Stack spacing="xl">
          <TextInput size="md" label="Title" {...form.getInputProps('title')} />
          <TextInput size="md" label="Artist" {...form.getInputProps('artist')} />
          <TextInput size="md" label="Album" {...form.getInputProps('album')} />
          <Grid columns={24} gutter="lg">
            <Grid.Col span={12}>
              <Center>
                <div onClick={onFindArtworkListener} className={styles.imageview}>
                  <Image src={srcData} radius="md" width={250} height={250} />
                </div>
              </Center>
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput size="md" label="Genre" {...form.getInputProps('genre')} />
              <Space h="md" />
              <Group grow>
                <TextInput value={track.time} size="md" label="Time" readOnly />
                <TextInput size="md" label="BPM" {...form.getInputProps('bpm')} />
              </Group>
              <Space h="md" />
              <Group grow>
                <TextInput size="md" label="Year" {...form.getInputProps('year')} />
                <TextInput size="md" label="Key" {...form.getInputProps('key')} />
              </Group>
            </Grid.Col>
          </Grid>
          <Group position="right" mt="md">
            <div style={{ marginRight: 30 }}>
              <Button size="md" variant="default" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <div style={{ width: 120 }}>
              <Button size="md" fullWidth type="submit" color="blue" variant="filled">
                Save
              </Button>
            </div>
          </Group>
        </Stack>
      </form>
    </Container>
  );
};

const TrackDetailView = () => {
  const { trackId } = useParams();
  const [track, setTrack] = React.useState(null);

  React.useEffect(() => {
    if (trackId) {
      const detailed = window.Main.GetTrack(trackId);
      setTrack(detailed);
    }

    return () => setTrack(null);
  }, [trackId]);

  return <>{track && <TrackDetail track={track} />}</>;
};

export default TrackDetailView;
