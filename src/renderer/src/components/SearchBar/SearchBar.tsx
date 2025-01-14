import { useEffect, useState } from 'react';
import { Track } from 'src/preload/types/harmony';
import styles from './SearchBar.module.css';
import { Autocomplete, AutocompleteProps, Group, Text } from '@mantine/core';
import { getHotkeyHandler, useClickOutside } from '@mantine/hooks';

type Props = {
  tracks: Track[];
};

type TrackData = Record<string, Track>;

function SearchBar({ tracks }: Props) {
  const [titles, setTitles] = useState<string[]>([]);
  const [data, setData] = useState<TrackData>({});
  const [value, setValue] = useState('');
  const [opened, setOpened] = useState(false);
  const ref = useClickOutside(() => {
    setOpened(false);
    setValue('');
  });

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
    if (value) {
      setOpened(true);
    }

    return () => {
      setOpened(false);
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

  const downFocus = () => {
    setValue('');
    setOpened(false);
  };

  return (
    <div className={styles.searchBar}>
      <Autocomplete
        ref={ref}
        data={titles}
        value={value}
        onChange={setValue}
        renderOption={renderAutocompleteOption}
        dropdownOpened={opened}
        maxDropdownHeight={300}
        placeholder='Search'
        onKeyDown={getHotkeyHandler([
          ['enter', () => console.log('enter')],
          ['alt + Q', () => downFocus()],
        ])}
      />
    </div>
  );
}

export default SearchBar;
