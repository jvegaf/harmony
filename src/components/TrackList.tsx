import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { Track } from "../../electron/types";
import { useState } from "react";

export interface TrackListProps {
  tracks: Track[];
  playTrack: (id: string) => void;
}

export function TrackList({ tracks, playTrack }: TrackListProps) {
  // const data = useLibraryStore((state) => state.tracks);
  const data = tracks;
  const [rowSelection, setRowSelection] = useState({});

  const columnHelper = createColumnHelper<Track>();

  const columns = [
    columnHelper.accessor("title", {
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.artist, {
      id: "artist",
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Last Name</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("album", {
      header: () => "Album",
      cell: (info) => info.renderValue(),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("bpm", {
      header: () => <span>Visits</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("year", {
      header: "Year",
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("genre", {
      header: "Genre",
      footer: (info) => info.column.id,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
  });

  const playTrackHandler = (event: any) => console.log(event);

  return (
    <div>
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            return (
              <tr key={row.id} onDoubleClick={playTrackHandler}>
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="p-1">
              {/* <IndeterminateCheckbox */}
              {/*   {...{ */}
              {/*     checked: table.getIsAllPageRowsSelected(), */}
              {/*     indeterminate: table.getIsSomePageRowsSelected(), */}
              {/*     onChange: table.getToggleAllPageRowsSelectedHandler(), */}
              {/*   }} */}
              {/* /> */}
            </td>
            <td colSpan={20}>Page Rows ({table.getRowModel().rows.length})</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
