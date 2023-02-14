import { Box, createStyles } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { useViewportSize } from "@mantine/hooks";
import type { Track, TrackId } from "shared/types/emusik";
import useAppState from "../hooks/useAppState";
import Columns from "./columns";
import React, { useContext } from "react";
import PlayerContext from "renderer/context/PlayerContext";
import { PlayerContextType } from "renderer/@types/emusik";

interface TrackListProps {
  height: number;
  tracks: Track[];
  columns: [];
  playingId?: TrackId;
  playTrack: (track: Track) => void;
  updateTrackDetail: (id: TrackId) => void;
  onFixTracks: (tracks: Track[]) => void;
}

const useStyles = createStyles(() => ({
  isPlaying: { backgroundColor: "#1793f8" },
}));

const TrackListView: React.FC<TrackListProps> = (props) => {
  const { height, columns, tracks, playTrack, playingId, updateTrackDetail, onFixTracks } = props;
  const [selectedRecords, setSelectedRecords] = React.useState<Track[]>([]);
  const { classes } = useStyles();

  const fixTracksHandler = (track) => {
    if (selectedRecords.length) {
      onFixTracks(selectedRecords);
      return;
    }
    onFixTracks([track]);
  };

  return (
    <Box sx={{ height: height }}>
      <DataTable
        withBorder
        striped
        textSelectionDisabled
        rowClassName={(track) => (track.id === playingId ? classes.isPlaying : undefined)}
        records={tracks}
        columns={columns}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        rowContextMenu={{
          shadow: "xl", // custom shadow
          borderRadius: "md", // custom border radius
          items: (track) => [
            {
              key: "play",
              color: "green",
              onClick: () => playTrack(track),
            },
            {
              key: "fixTags",
              onClick: () => fixTracksHandler(track),
            },
            // add a divider between `delete` and `sendMessage` items
            { key: "divider1", divider: true },
            {
              key: "showDetails",
              onClick: () => updateTrackDetail(track.id),
            },
          ],
        }}
      />
    </Box>
  );
};

export const TrackList: React.FC = () => {
  const { tracksLoaded, updateTrackDetail, playTrack, onFixTracks } = useAppState();
  const { playingId } = useContext(PlayerContext) as PlayerContextType;
  const { height } = useViewportSize();
  const [tracks, setTracks] = React.useState([]);
  const columns = Columns();

  React.useEffect(() => {
    if (window.Main) {
      window.Main.on("all-tracks", (updatedTracks) => setTracks(updatedTracks));
    }
  }, []);

  React.useEffect(() => {
    if (tracksLoaded) {
      window.Main.GetAll();
    }
  }, [tracksLoaded]);

  const tableprops = {
    height,
    tracks,
    columns,
    playingId,
    playTrack,
    updateTrackDetail,
    onFixTracks,
  };

  return <TrackListView {...tableprops} />;
};
