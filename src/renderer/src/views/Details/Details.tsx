import React, { useCallback, useEffect, useState } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import { Button, Grid, GridCol, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconBrandGoogle,
  IconTag,
  IconEraser,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconReplace,
  IconStarOff,
  IconWand,
  IconFileImport,
  IconMusic,
} from '@tabler/icons-react';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Details.module.css';
import Cover from '../../components/Cover/Cover';
import TrackRatingComponent from '../../components/TrackRatingComponent/TrackRatingComponent';
import BeatportRecommendationsModal from '../../components/BeatportRecommendationsModal/BeatportRecommendationsModal';
import { useLibraryAPI } from '../../stores/useLibraryStore';
import { useTaggerAPI } from '../../stores/useTaggerStore';
import { useDetailsNavigationAPI, useDetailsNavigationStore } from '../../stores/useDetailsNavigationStore';
import { GetFilenameWithoutExtension } from '../../lib/utils-library';
import { parseDuration } from '../../lib/utils';
import { BeatportRecommendation, SearchEngine } from '../../../../preload/types/harmony';
import { SanitizedTitle } from '../../../../preload/utils';

const { menu, shell } = window.Main;

// AIDEV-NOTE: Utility to extract Beatport track ID from URL
// Beatport URLs format: https://www.beatport.com/track/{slug}/{id}
const extractBeatportTrackId = (url: string): number | null => {
  if (!url) return null;
  const match = url.match(/beatport\.com\/track\/[^/]+\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export default function DetailsView() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { track } = useLoaderData() as DetailsLoaderData;
  const libraryAPI = useLibraryAPI();
  const taggerAPI = useTaggerAPI();
  const detailsNavAPI = useDetailsNavigationAPI();
  const { getPreviousTrackId, getNextTrackId } = useDetailsNavigationStore();

  // AIDEV-NOTE: State for Beatport Recommendations modal
  const [recommendationsModalOpened, setRecommendationsModalOpened] = useState(false);
  const [recommendations, setRecommendations] = useState<BeatportRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

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
      // Changed behavior - Save no longer navigates away
      // User can continue editing or navigate manually with Cancel or Prev/Next buttons
      await libraryAPI.updateTrackMetadata(track.id, values);
      form.resetDirty(values);
      revalidator.revalidate();

      // Show success notification
      notifications.show({
        title: 'Saved',
        message: 'Track metadata updated successfully',
        color: 'green',
        autoClose: 2000,
      });
    },
    [track, libraryAPI, form, revalidator],
  );

  // Navigation handlers with unsaved changes confirmation
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

  // Handler to replace underscores with spaces in all text fields
  const replaceUnderscoresWithSpaces = useCallback(() => {
    const currentValues = form.getValues();
    const updatedValues: Record<string, string> = {};
    const textFields = ['title', 'artist', 'album', 'genre', 'label', 'comment', 'url'] as const;

    for (const field of textFields) {
      const value = currentValues[field];
      if (typeof value === 'string' && value.includes('_')) {
        updatedValues[field] = value.replace(/_/g, ' ');
      }
    }

    if (Object.keys(updatedValues).length > 0) {
      form.setValues(updatedValues);
    }
  }, [form]);

  const resetRating = useCallback(() => {
    form.setValues({ rating: { source: '', rating: '0' } });
  }, [form]);

  const findCandidates = useCallback(async () => {
    // Disable auto-apply when finding candidates from Detail View
    // User should always see the selection modal, even for perfect matches
    await taggerAPI.findCandidates([track], { autoApply: false });
  }, [track, taggerAPI]);

  const replaceFile = useCallback(async () => {
    try {
      // Get the current file extension to restrict picker to same format
      const currentExt = track.path.split('.').pop()?.toLowerCase() || 'mp3';

      // Open file picker restricted to the same extension
      const result = await window.Main.dialog.open({
        title: 'Select replacement audio file',
        filters: [
          { name: `Audio Files (.${currentExt})`, extensions: [currentExt] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      // User cancelled
      if (!result || result.canceled || result.filePaths.length === 0) {
        return;
      }

      const newFilePath = result.filePaths[0];

      // Call the IPC method to replace the file
      await window.Main.library.replaceFile(track.id, track.path, newFilePath);

      // Show success notification
      notifications.show({
        title: 'File Replaced',
        message: 'Track file replaced and metadata updated successfully',
        color: 'green',
        autoClose: 3000,
      });

      // Refresh the view to show updated metadata
      revalidator.revalidate();
    } catch (error) {
      notifications.show({
        title: 'Replacement Failed',
        message: error instanceof Error ? error.message : 'Failed to replace file',
        color: 'red',
        autoClose: 5000,
      });
    }
  }, [track, revalidator]);

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

  // AIDEV-NOTE: Fetch Beatport recommendations for the current track
  const fetchBeatportRecommendations = useCallback(async () => {
    const bpTrackId = extractBeatportTrackId(track.url);
    if (!bpTrackId) {
      notifications.show({
        title: 'Invalid Beatport URL',
        message: 'Could not extract Beatport track ID from URL',
        color: 'red',
      });
      return;
    }

    try {
      setLoadingRecommendations(true);
      setRecommendationsModalOpened(true);
      const results = await window.Main.library.findSimilars(bpTrackId);
      setRecommendations(results);
    } catch (error) {
      notifications.show({
        title: 'Failed to fetch recommendations',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        color: 'red',
      });
      setRecommendationsModalOpened(false);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [track.url]);

  return (
    <div className={`${appStyles.view} ${styles.viewDetails}`}>
      <div className={styles.detailsLeft}>
        <Stack
          gap='xs'
          className={styles.detailsButtons}
        >
          <Button
            variant='light'
            leftSection={<IconTag size={18} />}
            onClick={filenameToTag}
            fullWidth
          >
            Filename to Tag
          </Button>
          <Button
            variant='light'
            leftSection={<IconReplace size={18} />}
            onClick={replaceUnderscoresWithSpaces}
            fullWidth
          >
            Replace with space
          </Button>
          <Button
            variant='light'
            leftSection={<IconEraser size={18} />}
            onClick={clearComments}
            fullWidth
          >
            Clear Comments
          </Button>
          <Button
            variant='light'
            leftSection={<IconStarOff size={18} />}
            onClick={resetRating}
            fullWidth
          >
            Reset rating
          </Button>
          <Button
            variant='light'
            leftSection={<IconWand size={18} />}
            onClick={findCandidates}
            fullWidth
          >
            Find Tag Candidates
          </Button>
          <Button
            variant='light'
            leftSection={<IconFileImport size={18} />}
            onClick={replaceFile}
            fullWidth
          >
            File Replacement
          </Button>
          <Button
            variant='outline'
            leftSection={<IconSearch size={18} />}
            onClick={() => searchOn(SearchEngine.BEATPORT)}
            fullWidth
          >
            Beatport
          </Button>
          <Button
            variant='outline'
            leftSection={<IconBrandGoogle size={18} />}
            onClick={() => searchOn(SearchEngine.GOOGLE)}
            fullWidth
          >
            Google
          </Button>
          <Button
            variant='outline'
            leftSection={<IconSearch size={18} />}
            onClick={() => searchOn(SearchEngine.TRAXSOURCE)}
            fullWidth
          >
            TraxxSource
          </Button>
          {track.url && (
            <Button
              variant='light'
              leftSection={<IconExternalLink size={18} />}
              onClick={() => shell.openExternal(track.url!)}
              fullWidth
            >
              Open Track Page
            </Button>
          )}
          {track.url && extractBeatportTrackId(track.url) && (
            <Button
              variant='light'
              leftSection={<IconMusic size={18} />}
              onClick={fetchBeatportRecommendations}
              fullWidth
            >
              Beatport Recommendations
            </Button>
          )}
        </Stack>
        <div className={styles.detailsCoverRating}>
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
            <GridCol span={4}>
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
            <GridCol span={3}>
              <TextInput
                label='Label'
                {...form.getInputProps('label')}
                key={form.key('label')}
                onContextMenu={handleContextMenu}
              />
            </GridCol>
            <GridCol span={2}>
              <TextInput
                readOnly
                label='Bitrate'
                value={track.bitrate ? `${track.bitrate} kbps` : ''}
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
            <TextInput
              readOnly
              label='Time'
              value={parseDuration(track.duration)}
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
      <BeatportRecommendationsModal
        opened={recommendationsModalOpened}
        onClose={() => setRecommendationsModalOpened(false)}
        recommendations={recommendations}
        loading={loadingRecommendations}
      />
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
