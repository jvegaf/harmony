// const { ipcRenderer } = window.require('electron'); // 👈 IF YOU TO USE NODE IN RENDERER, ENABLE NODE INGRESSION IN MAIN PROCESS

/* API LISTENERS */
window.ipc.send('message', 'ping 🏓');
window.ipc.receive('reply', (args) => {
  // eslint-disable-next-line no-console
  console.log(args);
});

/* LOCAL STORAGE LISTENERS */
window.ipc.set('unicorn', 'Hello World! 🦄');
// eslint-disable-next-line no-console
console.log(window.ipc.get('unicorn'));

// eslint-disable-next-line prettier/prettier
export { };
