import { Menu, MenuItem, MenuItemConstructorOptions } from 'electron';

const template: (MenuItemConstructorOptions | MenuItem)[] = [
  // {
  //   label: 'eMusik',
  //   submenu: [
  //     { role: 'about' },
  //     { type: 'separator' },
  //     { role: 'services' },
  //     { type: 'separator' },
  //     { role: 'hide' },
  //     { role: 'hideOthers' },
  //     { role: 'unhide' },
  //     { type: 'separator' },
  //     { role: 'quit' },
  //   ],
  // },
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: () => {
          // Handle the "Open" menu item click event
        },
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => {
          // Handle the "Save" menu item click event
        },
      },
      {
        label: 'Save As',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => {
          // Handle the "Save As" menu item click event
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          // Handle the "Exit" menu item click event
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: () => {
          // Handle the "Undo" menu item click event
        },
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
        click: () => {
          // Handle the "Redo" menu item click event
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        click: () => {
          // Handle the "Cut" menu item click event
        },
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: () => {
          // Handle the "Copy" menu item click event
        },
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        click: () => {
          // Handle the "Paste" menu item click event
        },
      },
    ],
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: () => {
          // Handle the "About" menu item click event
        },
      },
    ],
  },
];

const AppMenu = Menu.buildFromTemplate(template);
export default AppMenu;
