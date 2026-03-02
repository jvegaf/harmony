import { Track } from '../../../preload/types/harmony';
import { TrackCandidatesResult, TrackSelection } from '../../../preload/types/tagger';
import { GetFilenameWithoutExtension } from '@renderer/lib/utils-library';
import { createStore } from './store-helpers';
import router from '../views/router';

const { db, library, logger } = window.Main;

type TaggerState = {
  trackTagsCandidates: TrackCandidatesResult[] | null;
  candidatesSearching: boolean;
  candidatesSearchProgress: {
    processed: number;
    total: number;
    currentTrackTitle: string;
  };
  tagsApplying: boolean;
  tagsApplyProgress: {
    processed: number;
    total: number;
  };
  fixing: boolean;
  fix: {
    processed: number;
    total: number;
  };
  updated: Track | null;
  api: {
    findCandidates: (tracks: Track[], options?: { autoApply?: boolean }) => Promise<void>;
    setTagCandidates: (candidates: TrackCandidatesResult[] | null) => void;
    applyTrackTagsSelections: (selections: TrackSelection[]) => Promise<void>;
    filenameToTags: (tracks: Track[]) => Promise<void>;
    fixTrack: (trackID: string) => Promise<void>;
    toFix: (total: number) => void;
    setUpdated: (track: Track | null) => void;
  };
};

const filenameToTag = (track: Track) => {
  const filename = GetFilenameWithoutExtension(track.path);
  const parts = filename.split(' - ');
  if (parts.length < 2) return track;
  return { ...track, title: parts[1], artist: parts[0] };
};

const useTaggerStore = createStore<TaggerState>((set, get) => ({
  trackTagsCandidates: null,
  candidatesSearching: false,
  candidatesSearchProgress: {
    processed: 0,
    total: 0,
    currentTrackTitle: '',
  },
  tagsApplying: false,
  tagsApplyProgress: {
    processed: 0,
    total: 0,
  },
  fixing: false,
  fix: {
    processed: 0,
    total: 0,
  },
  updated: null,
  api: {
    findCandidates: async (tracks: Track[], options?: { autoApply?: boolean }): Promise<void> => {
      try {
        set({
          candidatesSearching: true,
          candidatesSearchProgress: { processed: 0, total: tracks.length, currentTrackTitle: '' },
        });

        logger.info(`Starting candidate search for ${tracks.length} tracks`);

        const trkCandidates = await library.findTagCandidates(tracks, options);

        if (trkCandidates.length === 0) {
          logger.info('All tracks were perfect matches (>= 90%) - auto-applied in background');
          set({
            candidatesSearching: false,
            candidatesSearchProgress: { processed: tracks.length, total: tracks.length, currentTrackTitle: '' },
            trackTagsCandidates: null,
          });
          return;
        }

        set({
          candidatesSearching: false,
          candidatesSearchProgress: { processed: tracks.length, total: tracks.length, currentTrackTitle: '' },
          trackTagsCandidates: trkCandidates,
        });

        logger.info(`Candidate search completed: ${trkCandidates.length} results`);
      } catch (err) {
        logger.error('Error finding candidates:', err as any);
        set({
          candidatesSearching: false,
          candidatesSearchProgress: { processed: 0, total: 0, currentTrackTitle: '' },
        });
      }
    },
    setTagCandidates: (candidates: TrackCandidatesResult[] | null) => {
      set({ trackTagsCandidates: candidates });
    },
    applyTrackTagsSelections: async (selections: TrackSelection[]) => {
      try {
        logger.info(`Applying Tags selections for ${selections.length} tracks`);

        const validSelections = selections.filter(s => s.selected_candidate_id !== null);

        if (validSelections.length === 0) {
          logger.info('No valid selections to apply');
          set({ trackTagsCandidates: null });
          return;
        }

        logger.info(`Processing ${validSelections.length} valid selections`);

        set({
          trackTagsCandidates: null,
          tagsApplying: true,
          tagsApplyProgress: { processed: 0, total: validSelections.length },
        });

        const trackIds = validSelections.map(s => s.local_track_id);
        const tracks = await db.tracks.findByID(trackIds);

        const result = await library.applyTagSelections(validSelections, tracks);

        set({
          tagsApplyProgress: { processed: validSelections.length, total: validSelections.length },
        });

        if (result.updated.length > 0) {
          await db.tracks.updateMultiple(result.updated);
          set({ updated: result.updated[result.updated.length - 1] });
          logger.info(`Batch update complete: ${result.updated.length} tracks persisted to DB`);
        }

        if (result.errors.length > 0) {
          logger.error(`Tag application errors: ${result.errors.length}`);
          result.errors.forEach(err => {
            logger.error(`  - Track ${err.trackId}: ${err.error}`);
          });
        }

        set({
          tagsApplying: false,
          tagsApplyProgress: { processed: 0, total: 0 },
        });

        router.revalidate();

        const currentPath = window.location.hash.replace('#', '');
        if (!currentPath.startsWith('/details/')) {
          window.location.hash = '#/library';
        }

        logger.info(
          `Tag application complete: ${result.updated.length} updated, ${result.errors.length} errors, ${selections.length - validSelections.length} skipped`,
        );
      } catch (err) {
        logger.error('Error in applyTrackTagsSelections:', err as any);
        set({
          trackTagsCandidates: null,
          tagsApplying: false,
          tagsApplyProgress: { processed: 0, total: 0 },
        });
      }
    },
    filenameToTags: async (tracks: Track[]): Promise<void> => {
      try {
        const updatedTracks = tracks.map(track => filenameToTag(track));

        await library.updateMetadataBatch(updatedTracks);
        await db.tracks.updateMultiple(updatedTracks);

        set({ updated: updatedTracks[updatedTracks.length - 1] });
        router.revalidate();

        logger.info(`Updated ${tracks.length} tracks from filenames`);
      } catch (err) {
        logger.error(err as any);
      }
    },
    fixTrack: async (trackID: string): Promise<void> => {
      let track = await db.tracks.findOnlyByID(trackID);
      const fixedTrack = await library.fixTags(track);
      track = {
        ...track,
        ...fixedTrack,
      };
      await db.tracks.update(track);
      const fixed = get().fix.processed + 1;
      const totalToFix = get().fix.total;

      set({
        fix: { processed: fixed, total: totalToFix },
        updated: track,
        fixing: fixed < totalToFix,
      });
    },
    toFix: (total: number): void => {
      set({ fixing: true, fix: { processed: 0, total: total } });
    },
    setUpdated: (track: Track | null): void => {
      set({ updated: track });
    },
  },
}));

export default useTaggerStore;

export function useTaggerAPI() {
  return useTaggerStore(state => state.api);
}
