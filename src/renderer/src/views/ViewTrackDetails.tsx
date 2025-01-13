import React, { useState } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate } from 'react-router-dom';
import { Button, Fieldset, Grid, GridCol, Group, Textarea, TextInput } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';

import { LoaderData } from './router';
import appStyles from './Root.module.css';
import styles from './ViewTrackDetails.module.css';
import Cover from '../components/Cover/Cover';
import TrackRatingComponent from '../components/TrackRatingComponent/TrackRatingComponent';

export default function ViewTrackDetails() {
  const navigate = useNavigate();
  const { track } = useLoaderData() as DetailsLoaderData;

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      title: '',
      artist: '',
      album: '',
      genre: '',
      year: '',
      bpm: '',
      initialKey: '',
      comment: '',
      rating: {
        source: '',
        rating: '',
      },
    },
    validate: {
      title: hasLength({ min: 3 }, 'Must be at least 3 characters'),
    },
  });

  React.useEffect(() => {
    form.setValues(track);
    form.resetDirty(track);
  }, [track]);

  const [submittedValues, setSubmittedValues] = useState<typeof form.values | null>(null);

  // const handleSubmit = useCallback(
  //   async (e: React.FormEvent<HTMLFormElement>) => {
  //     e.preventDefault();
  //     await libraryAPI.updateTrackMetadata(track.id, formData);
  //     navigate(-1);
  //   },
  //   [track, formData, navigate, libraryAPI],
  // );

  return (
    <div className={`${appStyles.view} ${styles.viewDetails}`}>
      <div className={styles.detailsLeft}>
        <div className={styles.detailsCover}>
          <Cover track={track} />
        </div>
        <div className={styles.rating}>
          <TrackRatingComponent
            trackSrc={track.path}
            rating={track.rating}
            size='xl'
          />
        </div>
      </div>
      <div className={styles.detailsRight}>
        <form onSubmit={form.onSubmit(setSubmittedValues)}>
          <TextInput
            {...form.getInputProps('path')}
            label='File'
          />
          <TextInput
            {...form.getInputProps('title')}
            mt='md'
            label='Title'
          />
          <TextInput
            {...form.getInputProps('artist')}
            mt='md'
            label='Artist'
          />
          <Grid
            justify='center'
            grow
          >
            <GridCol span={8}>
              <TextInput
                {...form.getInputProps('album')}
                mt='md'
                label='Album'
              />
            </GridCol>
            <GridCol span={4}>
              <TextInput
                {...form.getInputProps('genre')}
                mt='md'
                label='Genre'
              />
            </GridCol>
          </Grid>
          <Group
            justify='center'
            grow
          >
            <TextInput
              {...form.getInputProps('bpm')}
              mt='md'
              label='BPM'
            />
            <TextInput
              {...form.getInputProps('year')}
              mt='md'
              label='Year'
            />
            <TextInput
              {...form.getInputProps('initialKey')}
              mt='md'
              label='Key'
            />
          </Group>
          <Textarea
            {...form.getInputProps('comment')}
            mt='md'
            autosize
            minRows={8}
            label='Comments'
          />
          <Group
            justify='end'
            gap='xl'
          >
            <Button
              onClick={() => navigate(-1)}
              mt='md'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              mt='md'
            >
              Save
            </Button>
          </Group>
        </form>
      </div>
    </div>
  );
}

export type DetailsLoaderData = LoaderData<typeof ViewTrackDetails.loader>;

ViewTrackDetails.loader = async ({ params }: LoaderFunctionArgs) => {
  const { trackID } = params;

  if (trackID == null) {
    throw new Error(`Track ID should not be null`);
  }

  const track = await window.Main.db.tracks.findOnlyByID(trackID);

  return { track };
};
