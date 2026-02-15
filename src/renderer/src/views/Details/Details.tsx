import React, { useCallback, useEffect } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import { Button, Grid, GridCol, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import {
  IconSearch,
  IconBrandGoogle,
  IconTag,
  IconEraser,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
} from '@tabler/icons-react';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Details.module.css';
import Cover from '../../components/Cover/Cover';
import TrackRatingComponent from '../../components/TrackRatingComponent/TrackRatingComponent';
import { useLibraryAPI } from '../../stores/useLibraryStore';
import { useDetailsNavigationAPI, useDetailsNavigationStore } from '../../stores/useDetailsNavigationStore';
import { GetFilenameWithoutExtension } from '../../lib/utils-library';
import { SearchEngine } from '../../../../preload/types/harmony';
import { SanitizedTitle } from '../../../../preload/utils';

const { menu, shell } = window.Main;

export default function DetailsView() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { track } = useLoaderData() as DetailsLoaderData;
  const libraryAPI = useLibraryAPI();
  const detailsNavAPI = useDetailsNavigationAPI();
  const { getPreviousTrackId, getNextTrackId } = useDetailsNavigationStore();

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
      label: '',
      url: '',
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
      // AIDEV-NOTE: Changed behavior - Save no longer navigates away
      // User can continue editing or navigate manually with Cancel or Prev/Next buttons
      await libraryAPI.updateTrackMetadata(track.id, values);
      form.resetDirty(values);
      revalidator.revalidate();
    },
    [track, libraryAPI, form, revalidator],
  );

  // AIDEV-NOTE: Navigation handlers with unsaved changes confirmation
  const confirmNavigation = useCallback(
    (action: () => void) => {
      if (form.isDirty()) {
        modals.openConfirmModal({
          title: 'Unsaved changes',
          children: 'You have unsaved changes. Are you sure you want to leave without saving?',
          labels: { confirm: 'Leave', cancel: 'Stay' },
          confirmProps: { color: 'red' },
          onConfirm: action,
        });
      } else {
        action();
      }
    },
    [form],
  );

  const handlePrevious = useCallback(() => {
    confirmNavigation(() => {
      const prevTrackId = detailsNavAPI.navigateToPrevious();
      if (prevTrackId) {
        navigate(`/details/${prevTrackId}`);
      }
    });
  }, [confirmNavigation, detailsNavAPI, navigate]);

  const handleNext = useCallback(() => {
    confirmNavigation(() => {
      const nextTrackId = detailsNavAPI.navigateToNext();
      if (nextTrackId) {
        navigate(`/details/${nextTrackId}`);
      }
    });
  }, [confirmNavigation, detailsNavAPI, navigate]);

  const handleClose = useCallback(() => {
    confirmNavigation(() => {
      const originPath = detailsNavAPI.getOriginPath();
      navigate(originPath);
    });
  }, [confirmNavigation, detailsNavAPI, navigate]);

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
        <Stack
          gap='sm'
          mt='md'
        >
          <Group
            justify='center'
            gap='sm'
          >
            <Button
              variant='light'
              leftSection={<IconTag size={18} />}
              onClick={filenameToTag}
            >
              Filename to Tag
            </Button>
            <Button
              variant='light'
              leftSection={<IconEraser size={18} />}
              onClick={clearComments}
            >
              Clear Comments
            </Button>
          </Group>
          <Group
            justify='center'
            gap='xs'
          >
            <Button
              variant='outline'
              size='sm'
              leftSection={<IconSearch size={16} />}
              onClick={() => searchOn(SearchEngine.BEATPORT)}
            >
              Beatport
            </Button>
            <Button
              variant='outline'
              size='sm'
              leftSection={<IconBrandGoogle size={16} />}
              onClick={() => searchOn(SearchEngine.GOOGLE)}
            >
              Google
            </Button>
            <Button
              variant='outline'
              size='sm'
              leftSection={<IconSearch size={16} />}
              onClick={() => searchOn(SearchEngine.TRAXSOURCE)}
            >
              TraxxSource
            </Button>
          </Group>
          {track.url && (
            <Group
              justify='center'
              mt='xs'
            >
              <Button
                variant='light'
                size='sm'
                leftSection={<IconExternalLink size={16} />}
                onClick={() => shell.openExternal(track.url!)}
              >
                Open Track Page
              </Button>
            </Group>
          )}
        </Stack>
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
            <GridCol span={5}>
              <TextInput
                label='Album'
                {...form.getInputProps('album')}
                key={form.key('album')}
                onContextMenu={handleContextMenu}
              />
            </GridCol>
            <GridCol span={3}>
              <TextInput
                label='Genre'
                {...form.getInputProps('genre')}
                key={form.key('genre')}
                onContextMenu={handleContextMenu}
              />
            </GridCol>
            <GridCol span={4}>
              <TextInput
                label='Label'
                {...form.getInputProps('label')}
                key={form.key('label')}
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
          <TextInput
            label='Website / Track URL'
            placeholder='https://...'
            {...form.getInputProps('url')}
            key={form.key('url')}
            onContextMenu={handleContextMenu}
          />
          <Group
            mt='md'
            justify='space-between'
            gap='md'
          >
            <Group gap='xs'>
              <Button
                variant='subtle'
                leftSection={<IconChevronLeft size={18} />}
                onClick={handlePrevious}
                disabled={!getPreviousTrackId()}
              >
                Previous
              </Button>
              <Button
                variant='subtle'
                rightSection={<IconChevronRight size={18} />}
                onClick={handleNext}
                disabled={!getNextTrackId()}
              >
                Next
              </Button>
            </Group>
            <Group gap='xl'>
              <Button
                variant='subtle'
                className={styles.cancelBtn}
                onClick={handleClose}
              >
                Close
              </Button>
              <Button
                type='submit'
                variant='filled'
              >
                Save
              </Button>
            </Group>
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
