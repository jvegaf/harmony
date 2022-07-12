const Columns = () => [
  {
    Header:   "Title",
    accessor: "title"
  },
  {
    Header:   "Artist",
    accessor: "artist"
  },
  {
    Header:   "Time",
    accessor: "time",
    width:    25,
    align:    "center"
  },
  {
    Header:   "Album",
    accessor: "album"
  },
  {
    Header:   "Rate",
    accessor: "bitrate",
    width:    25
  },
  {
    Header:   "BPM",
    accessor: "bpm",
    width:    25
  },
  {
    Header:   "Key",
    accessor: "key",
    width:    25
  },
  {
    Header:   "Year",
    accessor: "year",
    width:    25
  }
];

export default Columns;
