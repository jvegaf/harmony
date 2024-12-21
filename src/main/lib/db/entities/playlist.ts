import { EntitySchema } from 'typeorm';

import { Playlist } from '../../../../preload/types/emusik';

export const PlaylistEntity = new EntitySchema<Playlist>({
  name: 'playlist',
  columns: {
    id: {
      type: String,
      primary: true,
    },
    name: {
      type: String,
      nullable: false,
    },
  },
  relations: {
    tracks: {
      type: 'many-to-many',
      target: 'track',
      eager: true,
      joinTable: true,
      cascade: true,
    },
  },
});
