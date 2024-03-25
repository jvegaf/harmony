import { FC, useState } from "react"
import useAppStore from '../stores/useAppStore';
import useLibraryStore from '../stores/useLibraryStore';
import usePlayerStore from '../stores/usePlayerStore';
import { Track } from '@preload/emusik';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, getKeyValue } from "@nextui-org/table";

export const TrackList: FC = () => {
  const rows: Track[] = useLibraryStore(state => state.tracks);
  const start = usePlayerStore(state => state.api.start);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const contentHeight = useAppStore(state => state.contentHeight);
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  const columns = [
    {
      key: "title",
      label: "TITLE",
    },
    {
      key: "artist",
      label: "ARTIST",
    },
    {
      key: "album",
      label: "ALBUM",
    },
    {
      key: "year",
      label: "YEAR",
    },
    {
      key: "genre",
      label: "GENRE",
    },
    {
      key: "bpm",
      label: "BPM",
    }
  ];

  const playTrackHandler = key => {
    setSelectedKeys(new Set([]));
    start(key);
  };

  return (
    <Table
      isStriped
      selectionMode="multiple"
      selectionBehavior="replace"
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      onRowAction={(key) => playTrackHandler(key)}
      aria-label="Example table with dynamic content"
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={rows}>
        {(item) => (
          <TableRow key={item.id}>
            {(columnKey) => <TableCell>{getKeyValue(item, columnKey)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
