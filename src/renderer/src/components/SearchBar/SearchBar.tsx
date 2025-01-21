import { useEffect, useState } from 'react';
import { Track } from 'src/preload/types/harmony';
import styles from './SearchBar.module.css';
import { Autocomplete, AutocompleteProps, Group, Text } from '@mantine/core';
import useLibraryStore from '../../stores/useLibraryStore';

type Props = {
  tracks: Track[];
};

type TrackData = Record<string, Track>;

function SearchBar({ tracks }: Props) {
  const [titles, setTitles] = useState<string[]>([]);
  const [data, setData] = useState<TrackData>({});
  const libraryAPI = useLibraryStore.use.api();

  useEffect(() => {
    const tracksData = tracks.reduce<TrackData>((acc, track) => {
      acc[`${track.artist} ${track.title}`] = track;
      return acc;
    }, {});
    const titles = Object.keys(tracksData);
    setTitles(titles);
    setData(tracksData);

    return () => {
      setTitles([]);
      setData({});
    };
  }, [tracks]);

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => (
    <Group gap='sm'>
      {/* <Avatar */}
      {/*   src={usersData[option.value].image} */}
      {/*   size={36} */}
      {/*   radius='xl' */}
      {/* /> */}
      <div>
        <Text size='sm'>{data[option.value].title}</Text>
        <Text
          size='xs'
          opacity={0.5}
        >
          {data[option.value].artist}
        </Text>
      </div>
    </Group>
  );

  const selected = (value: string) => {
    const result = tracks.filter(track => value.toLowerCase().includes(track.title.toLowerCase()));
    libraryAPI.setSearched(result[0]);
  };

  return (
    <div className={styles.searchBar}>
      <Autocomplete
        data={titles}
        onChange={selected}
        renderOption={renderAutocompleteOption}
        maxDropdownHeight={300}
        placeholder='Search'
      />
    </div>
  );
}

export default SearchBar;
