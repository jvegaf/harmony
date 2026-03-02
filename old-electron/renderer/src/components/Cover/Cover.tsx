import { useEffect, useState } from 'react';
import * as AspectRatio from '@radix-ui/react-aspect-ratio';
import { Track } from '../../../../preload/types/harmony';
import Placeholder from '../../assets/placeholder.png';

import styles from './Cover.module.css';
import { Image } from '@mantine/core';

type Props = {
  track: Track | null;
};

const { getCoverAsBase64 } = window.Main.covers;

export default function Cover(props: Props) {
  const [coverPath, setCoverPath] = useState<string | null>(null);

  useEffect(() => {
    if (props.track) {
      const refreshCover = async () => {
        const coverPath = await getCoverAsBase64(props.track!);
        setCoverPath(coverPath);
      };

      refreshCover();
    }
  }, [props.track]);

  if (coverPath) {
    const encodedCoverPath = encodeURI(coverPath).replace(/'/g, "\\'").replace(/"/g, '\\"');

    return (
      <AspectRatio.Root ratio={1}>
        <img
          src={encodedCoverPath}
          alt='Album cover'
          className={styles.cover}
        />
      </AspectRatio.Root>
    );
  }

  return (
    <AspectRatio.Root ratio={1}>
      <Image
        src={Placeholder}
        alt='Album cover'
        className={styles.cover}
      />
    </AspectRatio.Root>
  );
}
