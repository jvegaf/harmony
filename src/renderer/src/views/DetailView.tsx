import useLibraryStore from '@renderer/stores/useLibraryStore';
import useAppStore from '@renderer/stores/useAppStore';
import { FC, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { TextInput, Button, Image } from '@mantine/core';
import PlaceHolder from '../assets/placeholder.png';
import classes from './DetailView.module.css';
import { Track } from '@preload/emusik';

export const DetailView: FC = () => {
  const contentHeight = useAppStore(state => state.contentHeight);
  const { trackId } = useParams();
  const getTrackFromId = useLibraryStore(state => state.getTrackFromId);
  const getArtImage = useAppStore(state => state.getArtImage);
  const [artSrc, setArtSrc] = useState<string | null>(null);

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

  const setArtwork = async (track: Track) => {
    const artImage = await getArtImage(track);
    if (artImage === null) {
      setArtSrc(null);
      return;
    }
    console.log(artImage.mime);
    console.log(artImage.imageBuffer.length);
    const blob = new Blob([artImage.imageBuffer], { type: artImage.mime });

    const src = URL.createObjectURL(blob);
    setArtSrc(src);
  };

  useEffect(() => {
    console.log(trackId);
    const track = getTrackFromId(trackId);
    if (!track) return;
    form.setInitialValues(track);
    form.setValues(track);
    setArtwork(track);

    return () => {
      form.reset();
    };
  }, [trackId]);

  return (
    <div
      className={classes.detailRoot}
      style={{ height: contentHeight }}
    >
      <div className={classes.detailImage}>
        <Image
          src={artSrc}
          radius='lg'
          h={250}
          fallbackSrc={PlaceHolder}
        />
      </div>
      <div className={classes.detailForm}>
        <form onSubmit={form.onSubmit(values => console.log(values))}>
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
        </form>
      </div>
    </div>
  );
};
