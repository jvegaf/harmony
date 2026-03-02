import { BrowserWindow, ipcMain, IpcMainEvent, Menu, MenuItemConstructorOptions, PopupOptions, shell } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { SearchEngineConfig, TrklistCtxMenuPayload } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import ConfigModule from './ConfigModule';
import { SanitizedTitle } from '../../preload/utils';

/**
 * Module in charge of context menus for tracks, playlists, and common actions.
 * Search engines are loaded dynamically from ConfigModule.
 * Users can configure custom search engines via Settings > General.
 */
class ContextMenuModule extends ModuleWindow {
  private configModule: ConfigModule;

  constructor(window: Electron.BrowserWindow, configModule: ConfigModule) {
    super(window);
    this.configModule = configModule;
  }

  async load(): Promise<void> {
    ipcMain.removeAllListeners(channels.TRKLIST_MENU_SHOW);
    ipcMain.removeAllListeners(channels.PLAYLIST_MENU_SHOW);
    ipcMain.removeAllListeners(channels.COMMON_MENU_SHOW);

    ipcMain.on(channels.TRKLIST_MENU_SHOW, (event: IpcMainEvent, payload: TrklistCtxMenuPayload) => {
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
        // Use sanitized query for all search engines (removes remix info, etc.)
        const sanitizedQuery = encodeURIComponent(`${track.artist} ${SanitizedTitle(track.title)}`);

        // Build search menu from configured search engines
        const searchEngines = this.configModule.getConfig().get('searchEngines') || [];
        searchEngines.forEach((engine: SearchEngineConfig) => {
          const url = engine.urlTemplate.replace('{query}', sanitizedQuery);
          searchInTemplate.push({
            label: `Search in ${engine.name}`,
            click: () => {
              shell.openExternal(url);
            },
          });
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
          label: 'Filename->Tag',
          click: () => {
            event.sender.send(channels.CMD_FILENAME_TAGS, selected);
          },
        },
        {
          label: 'Find Tag Candidates',
          click: () => {
            event.sender.send(channels.CMD_FIND_CANDIDATES, selected);
          },
        },
        {
          label: 'Analyze Audio',
          click: () => {
            event.sender.send(channels.CMD_ANALYZE_AUDIO, selected);
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

    ipcMain.on(channels.PLAYLIST_MENU_SHOW, (event: IpcMainEvent, playlistId: string) => {
      const playListTemplate: MenuItemConstructorOptions[] = [];
      playListTemplate.push(
        {
          label: 'Rename',
          click: () => event.sender.send(channels.CMD_PLAYLIST_RENAME, playlistId),
        },
        { label: 'Duplicate', click: () => event.sender.send(channels.CMD_PLAYLIST_DUPLICATE, playlistId) },
        { label: 'Export', click: () => event.sender.send(channels.CMD_PLAYLIST_EXPORT, playlistId) },
        {
          type: 'separator',
        },
        {
          label: 'Delete',
          click: () => event.sender.send(channels.CMD_PLAYLIST_REMOVE, playlistId),
        },
      );

      const menu = Menu.buildFromTemplate(playListTemplate);
      menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
    });

    ipcMain.on(channels.COMMON_MENU_SHOW, (event: IpcMainEvent) => {
      const menu = Menu.buildFromTemplate([
        { role: 'copy' },
        { role: 'cut' },
        { role: 'paste' },
        { role: 'selectAll' },
      ]);

      menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
    });
  }
}

export default ContextMenuModule;
