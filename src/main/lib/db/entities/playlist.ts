import { EntitySchema } from 'typeorm';

import { Playlist } from '../../../../preload/types/harmony';

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
    playlistTracks: {
      type: 'one-to-many',
      target: 'playlistTrack',
      inverseSide: 'playlist',
      cascade: true,
      eager: true,
    },
  },
});
