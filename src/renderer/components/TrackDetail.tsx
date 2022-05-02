import React, { useState } from 'react';
import {
  Button,
  Container,
  createStyles,
  Group,
  SimpleGrid,
  TextInput,
} from '@mantine/core';
import { Track } from '../../shared/types/emusik';

interface TrackDetailProps {
  track: Track;
  endCB: () => void;
}

const useStyles = createStyles((theme) => ({
  detail: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
  },
  detailRow: {
    margin: 10,
    width: '100%',
  },
  actionButton: {
    marginRight: 30,
    paddingLeft: 20,
    paddingRight: 20,
  },
}));

const TrackDetail: React.FC<TrackDetailProps> = (props) => {
  const { track, endCB } = props;
  const [trackTitle, setTrackTitle] = useState(track.title);
  const [trackArtist, setTrackArtist] = useState(track.artist);
  const [trackBpm, setTrackBpm] = useState(track.bpm);
  const [trackKey, setTrackKey] = useState(track.key);
  const { classes } = useStyles();

  const onCancel = () => endCB();

  return (
    <Container className={classes.detail}>
      <TextInput
        className={classes.detailRow}
        value={trackTitle}
        label="Title"
        onChange={(event) => setTrackTitle(event.currentTarget.value)}
      />
      <TextInput
        className={classes.detailRow}
        value={trackArtist}
        label="Artist"
        onChange={(event) => setTrackArtist(event.currentTarget.value)}
      />
      <SimpleGrid className={classes.detailRow} cols={3}>
        <div>
          <TextInput value={track.time} label="Time" readOnly />
        </div>
        <div>
          <TextInput
            value={trackBpm}
            label="BPM"
            onChange={(event) => setTrackBpm(event.currentTarget.value)}
          />
        </div>
        <div>
          <TextInput
            value={trackKey}
            label="Key"
            onChange={(event) => setTrackKey(event.currentTarget.value)}
          />
        </div>
      </SimpleGrid>
      <Group className={classes.detailRow} position="right">
        <Button className={classes.actionButton} variant="default">
          Save
        </Button>
        <Button
          className={classes.actionButton}
          variant="default"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </Group>
    </Container>
  );
};

export default TrackDetail;
