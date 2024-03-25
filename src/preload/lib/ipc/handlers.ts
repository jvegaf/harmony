import {
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainEvent,
  Menu,
  MenuItemConstructorOptions,
  PopupOptions,
} from "electron";
import log from "electron-log/main";
import {
  ARTWORK_UPDATED,
  FIND_ARTWORK,
  FIX_COMMAND,
  FIX_TRACK,
  GET_ARTWORK,
  OPEN_FOLDER,
  PERSIST,
  PLAY_COMMAND,
  SAVE_ARTWORK,
  SHOW_CONTEXT_MENU,
  TRACK_UPDATED,
  VIEW_DETAIL_COMMAND,
} from "../../channels";
import FindArtwork from "../tagger/artwork-finder";
import { GetFilesFrom } from "../io/get-files";
import CreateTrack from "../track/creator";
import UpdateArtwork from "../artwork/updater";
import { LoadArtworkFromFile } from "../artwork/loader";
import FixTags from "../tagger/Tagger";
import PersistTrack from "../tag/saver";
import { Track } from "@preload/emusik";

export async function InitIpc(): Promise<void> {
  log.info("ipc initialized");

  ipcMain.on(PERSIST, (_, track) => PersistTrack(track));

  ipcMain.handle(FIND_ARTWORK, async (_, track: Track) => {
    const results = await FindArtwork(track);
    return results;
  });

  ipcMain.handle(OPEN_FOLDER, async () => {
    const resultPath = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (resultPath.canceled) return;

    const files = await GetFilesFrom(resultPath.filePaths[0]);

    const tracks = await Promise.all(
      files.map(async (file) => CreateTrack(file)),
    );

    log.info(" total tracks created: ", tracks.length);

    return tracks;
  });

  ipcMain.on(FIX_TRACK, async (event: IpcMainEvent, track: Track) => {
    log.info("track to fix: ", track.title);
    const updated = await FixTags(track);
    event.sender.send(TRACK_UPDATED, updated);
  });

  ipcMain.on(SAVE_ARTWORK, async (event, artTrack) => {
    const newTrack = await UpdateArtwork(artTrack);
    event.sender.send(ARTWORK_UPDATED, newTrack);
  });

  ipcMain.handle(GET_ARTWORK, async (_, file: string) => {
    const artwork = await LoadArtworkFromFile(file);
    return artwork;
  });

  ipcMain.on(SHOW_CONTEXT_MENU, (event: IpcMainEvent, selected: Track[]) => {
    const templateSingle = [
      {
        label: "View Details",
        click: () => {
          event.sender.send(VIEW_DETAIL_COMMAND, selected[0]);
        },
      },
      {
        label: "Play Track",
        click: () => {
          event.sender.send(PLAY_COMMAND, selected[0]);
        },
      },
      { type: "separator" },
      {
        label: "Fix Track",
        click: () => {
          event.sender.send(FIX_COMMAND, selected);
        },
      },
    ] as MenuItemConstructorOptions[];

    const templateMultiple = [
      {
        label: `Fix this ${selected.length} Tracks`,
        click: () => {
          event.sender.send(FIX_COMMAND, selected);
        },
      },
    ] as MenuItemConstructorOptions[];

    const template = selected.length > 1 ? templateMultiple : templateSingle;

    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
  });
}
