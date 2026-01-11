import React, { useCallback, useEffect } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate } from 'react-router-dom';
import { Button, Grid, GridCol, Group, Textarea, TextInput } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Details.module.css';
import Cover from '../../components/Cover/Cover';
import TrackRatingComponent from '../../components/TrackRatingComponent/TrackRatingComponent';
import { useLibraryAPI } from '../../stores/useLibraryStore';
import { GetFilenameWithoutExtension } from '../../lib/utils-library';
import { SearchEngine } from '../../../../preload/types/harmony';
import { SanitizedTitle } from '../../../../preload/utils';

const { menu, shell } = window.Main;

export default function DetailsView() {
  const navigate = useNavigate();
  const { track } = useLoaderData() as DetailsLoaderData;
  const libraryAPI = useLibraryAPI();
  const [selectedText, setSelectedText] = React.useState('');

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

  useEffect(() => {
    form.setValues(track);
    form.resetDirty(track);
  }, [track]);

  const handleSubmit = useCallback(
    async values => {
      await libraryAPI.updateTrackMetadata(track.id, values);
      navigate('/');
    },
    [track, navigate, libraryAPI],
  );

  const filenameToTag = useCallback(() => {
    const filename = GetFilenameWithoutExtension(track.path);
    const parts = filename.split(' - ');
    if (parts.length < 2) return;
    form.setValues({
      title: parts[1],
      artist: parts[0],
    });
  }, [track]);

  const clearComments = useCallback(() => {
    form.setValues({ comment: '' });
  }, []);

  const searchOn = useCallback(
    (engine: SearchEngine) => {
      const sanitizedQuery = encodeURIComponent(`${track.artist} ${SanitizedTitle(track.title)}`);
      const query = encodeURIComponent(`${track.artist} ${track.title}`);

      switch (engine) {
        case SearchEngine.BEATPORT:
          shell.openExternal(`https://www.beatport.com/tracks/search?q=${sanitizedQuery}`);
          break;
        case SearchEngine.TRAXSOURCE:
          shell.openExternal(`https://www.traxsource.com/search/tracks?term=${sanitizedQuery}`);
          break;
        case SearchEngine.GOOGLE:
          shell.openExternal(`https://www.google.com/search?q=${query}`);
          break;
        default:
          break;
      }
    },
    [shell, track],
  );

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    menu.common();
  }, []);

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
          <Group
            mt='md'
            justify='center'
          >
            <Button onClick={filenameToTag}>Filename to Tag</Button>
            <Button onClick={clearComments}>Clear Comments</Button>
            <Button onClick={() => searchOn(SearchEngine.BEATPORT)}>Search on Beatport</Button>
            <Button onClick={() => searchOn(SearchEngine.GOOGLE)}>Search on Google</Button>
            <Button onClick={() => searchOn(SearchEngine.TRAXSOURCE)}>Search on TraxxSource</Button>
          </Group>
        </div>
      </div>
      <div className={styles.detailsRight}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            readOnly
            label='File'
            value={GetFilenameWithoutExtension(track.path)}
            key={form.key('path')}
          />
          <TextInput
            label='Title'
            {...form.getInputProps('title')}
            key={form.key('title')}
            onContextMenu={handleContextMenu}
          />
          <TextInput
            label='Artist'
            {...form.getInputProps('artist')}
            key={form.key('artist')}
            onContextMenu={handleContextMenu}
          />
          <Grid
            justify='center'
            grow
          >
            <GridCol span={8}>
              <TextInput
                label='Album'
                {...form.getInputProps('album')}
                key={form.key('album')}
                onContextMenu={handleContextMenu}
              />
            </GridCol>
            <GridCol span={4}>
              <TextInput
                label='Genre'
                {...form.getInputProps('genre')}
                key={form.key('genre')}
                onContextMenu={handleContextMenu}
              />
            </GridCol>
          </Grid>
          <Group
            justify='center'
            grow
          >
            <TextInput
              label='BPM'
              {...form.getInputProps('bpm')}
              key={form.key('bpm')}
              onContextMenu={handleContextMenu}
            />
            <TextInput
              label='Year'
              {...form.getInputProps('year')}
              key={form.key('year')}
              onContextMenu={handleContextMenu}
            />
            <TextInput
              label='Key'
              {...form.getInputProps('initialKey')}
              key={form.key('initialKey')}
              onContextMenu={handleContextMenu}
            />
          </Group>
          <Textarea
            autosize
            minRows={8}
            label='Comments'
            {...form.getInputProps('comment')}
            key={form.key('comment')}
            onContextMenu={handleContextMenu}
          />
          <Group
            mt='md'
            justify='end'
            gap='xl'
          >
            <Button
              className={styles.cancelBtn}
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type='submit'>Save</Button>
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
