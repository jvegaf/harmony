import { BrowserWindow, ipcMain, IpcMainEvent, Menu, MenuItemConstructorOptions, PopupOptions, shell } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { CtxMenuPayload } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import { SanitizedTitle } from '../../preload/utils';

/**
 * Module in charge of returning the track with tags fixed
 */
class ContextMenuModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.removeAllListeners(channels.MENU_SHOW);

    ipcMain.on(channels.MENU_SHOW, (event: IpcMainEvent, payload: CtxMenuPayload) => {
      const { selected, playlists, currentPlaylist } = payload;

      const selectedCount = selected.length;
      let shownPlaylists = playlists;

      // Hide current playlist if needed
      if (currentPlaylist) {
        shownPlaylists = playlists.filter(elem => elem.id !== currentPlaylist);
      }

      const playlistTemplate: MenuItemConstructorOptions[] = [];

      // submenu para poder buscar en beatport y en google {artista titulo}
      const searchInTemplate: MenuItemConstructorOptions[] = [];

      if (shownPlaylists) {
        playlistTemplate.push(
          {
            label: 'Create new playlist...',
            click: () => {
              event.sender.send(channels.CMD_PLAYLIST_NEW, selected);
            },
          },
          {
            type: 'separator',
          },
        );

        if (shownPlaylists.length === 0) {
          playlistTemplate.push({
            label: 'No playlists',
            enabled: false,
          });
        } else {
          shownPlaylists.forEach(playlist => {
            playlistTemplate.push({
              label: playlist.name,
              click: () => {
                // logger.info(selected);
                event.sender.send(channels.CMD_TRACKS_PLAYLIST_ADD, { playlistId: playlist.id, selected });
              },
            });
          });
        }
      }

      const template: MenuItemConstructorOptions[] = [
        {
          label: selectedCount > 1 ? `${selectedCount} tracks selected` : `${selectedCount} track selected`,
          enabled: false,
        },
        {
          type: 'separator',
        },
        {
          label: 'Add to playlist',
          submenu: playlistTemplate,
        },
        {
          type: 'separator',
        },
      ];

      if (selectedCount < 2) {
        const track = selected[0];
        const sanitizedQuery = encodeURIComponent(`${track.artist} ${SanitizedTitle(track.title)}`);
        const query = encodeURIComponent(`${track.artist} ${track.title}`);

        searchInTemplate.push({
          label: 'Search in Beatport',
          click: () => {
            shell.openExternal(`https://www.beatport.com/search?q=${sanitizedQuery}`);
          },
        });
        searchInTemplate.push({
          label: 'Search in TraxxSource',
          click: () => {
            shell.openExternal(`https://www.traxsource.com/search/tracks?term=${sanitizedQuery}`);
          },
        });
        searchInTemplate.push({
          label: 'Search in Google',
          click: () => {
            shell.openExternal(`https://www.google.com/search?q=${query}`);
          },
        });
        track.artist &&
          template.push({
            label: `Search for "${track.artist}" `,
            click: () => {
              event.sender.send(channels.CMD_TRACK_ARTIST_FIND, track.artist);
            },
          });

        template.push(
          {
            label: 'Show in folder',
            click: () => {
              shell.showItemInFolder(track.path);
            },
          },
          {
            type: 'separator',
          },
          {
            label: 'Search',
            submenu: searchInTemplate,
          },
          {
            type: 'separator',
          },
          {
            label: 'Show Details',
            click: () => {
              event.sender.send(channels.CMD_TRACK_DETAIL, track.id);
            },
          },
        );
      }

      if (currentPlaylist) {
        template.push(
          {
            type: 'separator',
          },
          {
            label: 'Remove from playlist',
            click: () => {
              event.sender.send(channels.CMD_TRACKS_PLAYLIST_REMOVE, { playlistId: currentPlaylist, selected });
            },
          },
        );
      }

      template.push(
        {
          type: 'separator',
        },
        {
          label: 'Fix Tags',
          click: () => {
            event.sender.send(channels.CMD_FIX_TAGS, selected);
          },
        },
        {
          label: 'Find Tag Candidates',
          click: () => {
            event.sender.send(channels.CMD_FIND_CANDIDATES, selected);
          },
        },
        // {
        //   type: 'separator',
        // },
        // {
        //   label: 'Remove from library',
        //   click: () => {
        //     event.sender.send(channels.CMD_TRACKS_LIBRARY_REMOVE, selected);
        //   },
        // },
        {
          type: 'separator',
        },
        {
          label: 'Delete from disk',
          click: () => {
            event.sender.send(channels.CMD_TRACKS_DELETE, selected);
          },
        },
      );

      const menu = Menu.buildFromTemplate(template);
      menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
    });
  }
}

export default ContextMenuModule;
