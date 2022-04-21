import { Track } from '../../shared/types/emusik';

export type GlobalContextType = {
  tracks: Track[];
  openFolder: () => void;
};
