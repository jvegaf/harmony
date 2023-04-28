// eslint-disable-next-line import/no-extraneous-dependencies
import { app, Menu, shell } from 'electron';

const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
  /* FILE MENU */
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        click: () => {
          app.exit();
        },
      },
    ],
  } /* ABOUT MENU */,
  {
    label: 'About',
    submenu: [
      {
        label: 'More',
        click: () => {
          shell.openExternal('https://github.com/AjayKanniyappan');
        },
      },
    ],
  } /* HELP MENU */,
  {
    label: 'Help',
    submenu: [
      {
        label: 'Learn More',
        click: () => {
          shell.openExternal('https://github.com/stackoutput-com/vite-electron-react-boilerplate');
        },
      },
      {
        label: 'Documentation',
        click: () => {
          shell.openExternal(
            'https://github.com/stackoutput-com/vite-electron-react-boilerplate#readme',
          );
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);

export default menu;
