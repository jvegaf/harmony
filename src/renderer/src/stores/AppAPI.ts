const init = async (): Promise<void> => {
  // Tell the main process to show the window
  window.Main.app.ready();
};

// Should we use something else to harmonize between zustand and non-store APIs?
const AppAPI = {
  init,
};

export default AppAPI;
