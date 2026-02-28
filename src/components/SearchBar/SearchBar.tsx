import { useEffect, useState } from 'react';
import { Track } from '@/types/harmony';
import styles from './SearchBar.module.css';
import { Autocomplete, AutocompleteProps, Group, Text } from '@mantine/core';
import { useLibraryAPI } from '../../stores/useLibraryStore';

type Props = {
  tracks: Track[];
};

type TrackData = Record<string, Track>;

function SearchBar({ tracks }: Props) {
  const [titles, setTitles] = useState<string[]>([]);
  const [data, setData] = useState<TrackData>({});
  const libraryAPI = useLibraryAPI();
  const [value, setValue] = useState('');
  const [dropdownOpened, setDropdownOpened] = useState(false);

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

  useEffect(() => {
    value.length > 0 ? setDropdownOpened(true) : setDropdownOpened(false);

    const result = tracks.filter(track => value.toLowerCase().includes(track.title.toLowerCase()));
    if (result.length === 0) {
      return;
    }
    libraryAPI.setSearched(result[0]);
    setValue('');
    return () => {
      setDropdownOpened(false);
    };
  }, [value]);

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

  return (
    <div className={styles.searchBar}>
      <Autocomplete
        data={titles}
        dropdownOpened={dropdownOpened}
        onChange={setValue}
        value={value}
        renderOption={renderAutocompleteOption}
        maxDropdownHeight={300}
        placeholder='Search'
      />
    </div>
  );
}

export default SearchBar;
