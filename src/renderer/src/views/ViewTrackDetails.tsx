import React, { useCallback, useState } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate } from 'react-router-dom';

import Placeholder from '../assets/placeholder.png';
// import * as coverUtils from '../../main/lib/utils-cover';
import * as Setting from '../components/Setting/Setting';
import { useLibraryAPI } from '../stores/useLibraryStore';

import { LoaderData } from './router';
import appStyles from './Root.module.css';
import styles from './ViewTrackDetails.module.css';
import { TrackEditableFields } from '../../../preload/types/emusik';
import { Button } from '@mantine/core';

export default function ViewTrackDetails() {
  const { track } = useLoaderData() as DetailsLoaderData;
  const [coverSrc, setCoverSrc] = React.useState<string | null>(null);
  const getCover = useLibraryAPI().getCover;

  React.useEffect(() => {
    if (track.path) {
      getCover(track).then(cover => {
        if (cover) {
          setCoverSrc(cover);
        }
      });
    }
  }, [track, getCover]);

  const [formData, setFormData] = useState<TrackEditableFields>({
    title: track.title ?? '',
    artist: track.artist,
    album: track.album ?? '',
    genre: track.genre ?? '',
    year: track.year ?? '',
    bpm: track.bpm ?? '',
    initialKey: track.initialKey ?? '',
    comment: track.comment ?? '',
  });

  const libraryAPI = useLibraryAPI();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await libraryAPI.updateTrackMetadata(track.id, formData);
      navigate(-1);
    },
    [track, formData, navigate, libraryAPI],
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      navigate(-1);
    },
    [navigate],
  );

  return (
    <div className={`${appStyles.view} ${styles.viewDetails}`}>
      <div className={styles.detailsCover}>
        {coverSrc === null && (
          <img
            src={Placeholder}
            alt='Cover'
            width='400'
            height='400'
          />
        )}
        {coverSrc !== null && (
          <img
            src={coverSrc}
            alt='Cover'
            width='400'
            height='400'
          />
        )}
      </div>
      <form
        className={styles.detailsForm}
        onSubmit={handleSubmit}
      >
        <Setting.Section>
          <Setting.Label htmlFor='path'>File</Setting.Label>
          <Setting.Input
            id='path'
            name='path'
            type='text'
            value={track.path}
            readOnly
          />
        </Setting.Section>
        <Setting.Section>
          <Setting.Label htmlFor='title'>Title</Setting.Label>
          <Setting.Input
            id='title'
            name='title'
            type='text'
            value={formData.title}
            onChange={e => {
              setFormData({ ...formData, title: e.currentTarget.value });
            }}
          />
        </Setting.Section>
        <Setting.Section>
          <Setting.Label htmlFor='artist'>Artist</Setting.Label>
          <Setting.Input
            id='artist'
            name='artist'
            type='text'
            value={formData.artist}
            onChange={e => {
              setFormData({
                ...formData,
                artist: e.currentTarget.value,
              });
            }}
          />
        </Setting.Section>
        <div className={styles.albumRow}>
          <Setting.Section>
            <Setting.Label htmlFor='album'>Album</Setting.Label>
            <Setting.Input
              id='album'
              name='album'
              type='text'
              value={formData.album}
              onChange={e => {
                setFormData({ ...formData, album: e.currentTarget.value });
              }}
            />
          </Setting.Section>
          <Setting.Section>
            <Setting.Label htmlFor='genre'>Genre</Setting.Label>
            <Setting.Input
              id='genre'
              name='genre'
              type='text'
              value={formData.genre}
              onChange={e => {
                setFormData({
                  ...formData,
                  genre: e.currentTarget.value,
                });
              }}
            />
          </Setting.Section>
        </div>
        <div className={styles.detailRow}>
          <Setting.Section>
            <Setting.Label htmlFor='year'>Year</Setting.Label>
            <Setting.Input
              id='year'
              name='year'
              type='text'
              value={formData.year ?? ''}
              onChange={e => {
                setFormData({
                  ...formData,
                  year: Number.parseInt(e.currentTarget.value) ?? null,
                });
              }}
            />
          </Setting.Section>
          <Setting.Section>
            <Setting.Label htmlFor='bpm'>BPM</Setting.Label>
            <Setting.Input
              id='bpm'
              name='bpm'
              type='text'
              value={formData.bpm ?? ''}
              onChange={e => {
                setFormData({
                  ...formData,
                  bpm: Number.parseInt(e.currentTarget.value) ?? null,
                });
              }}
            />
          </Setting.Section>
          <Setting.Section>
            <Setting.Label htmlFor='initialKey'>Key</Setting.Label>
            <Setting.Input
              id='initialKey'
              name='initialKey'
              type='text'
              value={formData.initialKey ?? ''}
              onChange={e => {
                setFormData({
                  ...formData,
                  initialKey: e.currentTarget.value ?? null,
                });
              }}
            />
          </Setting.Section>
        </div>
        <Setting.Section>
          <Setting.Label htmlFor='comment'>Comments</Setting.Label>
          <Setting.TextArea
            id='comment'
            name='comment'
            rows={10}
            value={formData.comment ?? ''}
            onChange={e => {
              setFormData({
                ...formData,
                comment: e.currentTarget.value,
              });
            }}
          />
        </Setting.Section>
        <div className={styles.detailsActions}>
          <Button
            type='button'
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button type='submit'>Save</Button>
        </div>
      </form>
    </div>
  );
}

export type DetailsLoaderData = LoaderData<typeof ViewTrackDetails.loader>;

ViewTrackDetails.loader = async ({ params }: LoaderFunctionArgs) => {
  const { trackID } = params;

  if (trackID == null) {
    throw new Error(`Track ID should not be null`);
  }

  const track = await window.Main.db.tracks.findOnlyByID(trackID);

  return { track };
};
