import { EntitySchema } from 'typeorm';

import { Folder } from '../../../../preload/types/harmony';

/**
 * Folder Entity
 *
 * Stores playlist folders for hierarchical organization.
 * Supports bidirectional sync with Traktor's folder structure.
 *
 * AIDEV-NOTE: Uses self-referencing parentId for tree structure.
 * The path column stores the full folder path for quick lookups
 * and display (e.g., "DJ Sets/House/Deep House").
 */
export const FolderEntity = new EntitySchema<Folder>({
  name: 'folder',
  columns: {
    id: {
      type: String,
      primary: true,
    },
    name: {
      type: String,
      nullable: false,
    },
    parentId: {
      type: String,
      nullable: true,
    },
    path: {
      type: String,
      nullable: true,
      // AIDEV-NOTE: Full path for display and quick lookups
      // Computed from parent chain, e.g. "DJ Sets/House/Deep House"
    },
  },
  indices: [
    {
      name: 'IDX_folder_parentId',
      columns: ['parentId'],
    },
    {
      name: 'IDX_folder_path',
      columns: ['path'],
    },
  ],
  relations: {
    parent: {
      type: 'many-to-one',
      target: 'folder',
      joinColumn: { name: 'parentId' },
      nullable: true,
    },
    children: {
      type: 'one-to-many',
      target: 'folder',
      inverseSide: 'parent',
    },
    playlists: {
      type: 'one-to-many',
      target: 'playlist',
      inverseSide: 'folder',
    },
  },
});
