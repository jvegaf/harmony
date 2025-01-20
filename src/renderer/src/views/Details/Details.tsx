import React, { useCallback } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate } from 'react-router-dom';
import { Button, Grid, GridCol, Group, Textarea, TextInput } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Details.module.css';
import Cover from '../../components/Cover/Cover';
import TrackRatingComponent from '../../components/TrackRatingComponent/TrackRatingComponent';
import { useLibraryAPI } from '../../stores/useLibraryStore';

export default function DetailsView() {
  const navigate = useNavigate();
  const { track } = useLoaderData() as DetailsLoaderData;
  const libraryAPI = useLibraryAPI();

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

  const handleSubmit = useCallback(
    async values => {
      await libraryAPI.updateTrackMetadata(track.id, values);
      navigate(-1);
    },
    [track, navigate, libraryAPI],
  );

  const getFilenameWithoutExtension = (filePath: string): string => {
    const parts = filePath.split(/[/\\]/); 
    const filename = parts[parts.length - 1];
    const filenameWithoutExtension = filename.split('.').slice(0, -1).join('.');
    return filenameWithoutExtension;
  };

  const filenameToTag = useCallback(() => {
    const filename = getFilenameWithoutExtension(track.path);
    const parts = filename.split(' - ');
    if (parts.length < 2) return;
    form.setValues({
      title: parts[1],
      artist: parts[0],
    });
  }, [track]);

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
        <div>
          <Button
            onClick={filenameToTag}
            mt='md'
          >
            Filename to Tag
          </Button>
        </div>
      </div>
      <div className={styles.detailsRight}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            readOnly
            label='File'
            value={getFilenameWithoutExtension(track.path)}
            key={form.key('path')}
          />
          <TextInput
            mt='md'
            label='Title'
            {...form.getInputProps('title')}
            key={form.key('title')}
          />
          <TextInput
            mt='md'
            label='Artist'
            {...form.getInputProps('artist')}
            key={form.key('artist')}
          />
          <Grid
            justify='center'
            grow
          >
            <GridCol span={8}>
              <TextInput
                mt='md'
                label='Album'
                {...form.getInputProps('album')}
                key={form.key('album')}
              />
            </GridCol>
            <GridCol span={4}>
              <TextInput
                mt='md'
                label='Genre'
                {...form.getInputProps('genre')}
                key={form.key('genre')}
              />
            </GridCol>
          </Grid>
          <Group
            justify='center'
            grow
          >
            <TextInput
              mt='md'
              label='BPM'
              {...form.getInputProps('bpm')}
              key={form.key('bpm')}
            />
            <TextInput
              mt='md'
              label='Year'
              {...form.getInputProps('year')}
              key={form.key('year')}
            />
            <TextInput
              mt='md'
              label='Key'
              {...form.getInputProps('initialKey')}
              key={form.key('initialKey')}
            />
          </Group>
          <Textarea
            mt='md'
            autosize
            minRows={8}
            label='Comments'
            {...form.getInputProps('comment')}
            key={form.key('comment')}
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

export type DetailsLoaderData = LoaderData<typeof DetailsView.loader>;

DetailsView.loader = async ({ params }: LoaderFunctionArgs) => {
  const { trackID } = params;

  if (trackID == null) {
    throw new Error(`Track ID should not be null`);
  }

  const track = await window.Main.db.tracks.findOnlyByID(trackID);

  return { track };
};
