import React, { useCallback, useState } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate } from 'react-router-dom';
import { Button, Grid, GridCol, Group, Textarea, TextInput } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import Placeholder from '../assets/placeholder.png';
import { useLibraryAPI } from '../stores/useLibraryStore';

import { LoaderData } from './router';
import appStyles from './Root.module.css';
import styles from './ViewTrackDetails.module.css';

export default function ViewTrackDetails() {
  const { track } = useLoaderData() as DetailsLoaderData;
  const [coverSrc, setCoverSrc] = React.useState<string | null>(null);
  const getCover = useLibraryAPI().getCover;

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
    if (track.path) {
      getCover(track).then(cover => {
        if (cover) {
          setCoverSrc(cover);
        }
      });
    }
  }, [track, getCover]);

  const [submittedValues, setSubmittedValues] = useState<typeof form.values | null>(null);

  const libraryAPI = useLibraryAPI();
  const navigate = useNavigate();

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
      <div className={styles.detailsCover}>
        {coverSrc === null && (
          <img
            src={Placeholder}
            alt='Cover'
            width='400'
            height='400'
          />
        )}
        {coverSrc !== null && (
          <img
            src={coverSrc}
            alt='Cover'
            width='400'
            height='400'
          />
        )}
      </div>
      <div className={styles.detailsForm}>
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
              {...form.getInputProps('rating.source')}
              mt='md'
              label='Rating Source'
            />
            <TextInput
              {...form.getInputProps('rating.rating')}
              mt='md'
              label='Rating'
            />
          </Group>
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
