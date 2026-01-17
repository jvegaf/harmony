import { EntitySchema } from 'typeorm';

import { PlaylistTrack } from '../../../../preload/types/harmony';

export const PlaylistTrackEntity = new EntitySchema<PlaylistTrack>({
  name: 'playlistTrack',
  columns: {
    id: {
      type: String,
      primary: true,
    },
    playlistId: {
      type: String,
      nullable: false,
    },
    trackId: {
      type: String,
      nullable: false,
    },
    order: {
      type: Number,
      nullable: false,
    },
  },
  relations: {
    playlist: {
      type: 'many-to-one',
      target: 'playlist',
      joinColumn: { name: 'playlistId' },
      onDelete: 'CASCADE',
    },
    track: {
      type: 'many-to-one',
      target: 'track',
      eager: true,
      joinColumn: { name: 'trackId' },
      onDelete: 'CASCADE',
    },
  },
  orderBy: {
    order: 'ASC',
  },
});
