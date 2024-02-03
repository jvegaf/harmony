"use strict";
const electron = require("electron");
const OPEN_FOLDER = "OPEN_FOLDER";
const FIX_TRACK = "FIX_TRACK";
const GET_ARTWORK = "GET_ARTWORK";
const PERSIST = "PERSIST";
const SHOW_CONTEXT_MENU = "SHOW_CONTEXT_MENU";
const api = {
  ShowContextMenu: (selected) => electron.ipcRenderer.send(SHOW_CONTEXT_MENU, selected),
  OpenFolder: () => electron.ipcRenderer.send(OPEN_FOLDER),
  FixTrack: (track) => electron.ipcRenderer.send(FIX_TRACK, track),
  PersistTrack: (track) => electron.ipcRenderer.send(PERSIST, track),
  Log: (...args) => electron.ipcRenderer.send("log", ...args),
  FindArtWork: async (track) => electron.ipcRenderer.invoke("find-artwork", track),
  SaveArtWork: (artTrack) => electron.ipcRenderer.send("save-artwork", artTrack),
  GetArtWork: (filepath) => electron.ipcRenderer.invoke(GET_ARTWORK, filepath),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(channel, func) {
    electron.ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(channel, func) {
    electron.ipcRenderer.once(channel, (_event, ...args) => func(...args));
  }
};
electron.contextBridge.exposeInMainWorld("ipcRenderer", withPrototype(electron.ipcRenderer));
electron.contextBridge.exposeInMainWorld("Main", api);
function withPrototype(obj) {
  const protos = Object.getPrototypeOf(obj);
  for (const [key, value] of Object.entries(protos)) {
    if (Object.prototype.hasOwnProperty.call(obj, key))
      continue;
    if (typeof value === "function") {
      obj[key] = function(...args) {
        return value.call(obj, ...args);
      };
    } else {
      obj[key] = value;
    }
  }
  return obj;
}
function domReady(condition = ["complete", "interactive"]) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}
const safeDOM = {
  append(parent, child) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      parent.appendChild(child);
    }
  },
  remove(parent, child) {
    if (Array.from(parent.children).find((e) => e === child)) {
      parent.removeChild(child);
    }
  }
};
function useLoading() {
  const className = `loaders-css__square-spin`;
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");
  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;
  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    }
  };
}
const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);
window.onmessage = (ev) => {
  ev.data.payload === "removeLoading" && removeLoading();
};
setTimeout(removeLoading, 4999);
