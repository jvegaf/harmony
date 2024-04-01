import useLibraryStore from '@renderer/stores/useLibraryStore';
import useAppStore from '@renderer/stores/useAppStore';
import { FC, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { TextInput, Button } from '@mantine/core';
import classes from './DetailView.module.css';

export const DetailView: FC = () => {
  const contentHeight = useAppStore(state => state.contentHeight);
  const { trackId } = useParams();
  const getTrackFromId = useLibraryStore(state => state.getTrackFromId);

  const form = useForm({
    initialValues: {
      title: '',
      artist: '',
      album: '',
      year: '',
      genre: '',
      bpm: '',
      key: '',
    },
  });

  useEffect(() => {
    console.log(trackId);
    const track = getTrackFromId(trackId);
    if (!track) return;
    form.setInitialValues(track);
    form.setValues(track);

    return () => {
      form.reset();
    };
  }, [trackId]);

  return (
    <form onSubmit={form.onSubmit(values => console.log(values))}>
      <div
        className={classes.detailRoot}
        style={{ height: contentHeight }}
      >
        <div className={classes.detailForm}>
          <div className={classes.fullRow}>
            <TextInput
              label='Title'
              placeholder='Title'
              {...form.getInputProps('title')}
            />
          </div>
          <div className={classes.fullRow}>
            <TextInput
              label='Artist'
              placeholder='Artist'
              {...form.getInputProps('artist')}
            />
          </div>
          <div className={classes.rowComposed}>
            <TextInput
              label='Album'
              placeholder='Album'
              {...form.getInputProps('album')}
            />
            <TextInput
              label='Year'
              placeholder='Year'
              {...form.getInputProps('year')}
            />
          </div>
          <div className={classes.rowGenre}>
            <TextInput
              label='Genre'
              placeholder='Genre'
              {...form.getInputProps('genre')}
            />
            <TextInput
              label='BPM'
              placeholder='BPM'
              {...form.getInputProps('bpm')}
            />
            <TextInput
              label='Key'
              placeholder='Key'
              {...form.getInputProps('key')}
            />
          </div>
          <div className={classes.buttonsRow}>
            <Button
              component={Link}
              to='/'
            >
              Cancel
            </Button>
            <Button type='submit'>Save</Button>
          </div>
        </div>
      </div>
    </form>
  );
};
