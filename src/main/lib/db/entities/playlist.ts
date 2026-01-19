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
    // AIDEV-NOTE: Optional folder ID for Traktor playlist hierarchy support
    folderId: {
      type: String,
      nullable: true,
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
    folder: {
      type: 'many-to-one',
      target: 'folder',
      joinColumn: { name: 'folderId' },
      nullable: true,
    },
  },
});
