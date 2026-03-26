const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  startSearch: (options) => ipcRenderer.send("start-search", options),
  stopSearch: () => ipcRenderer.send("stop-search"),
  onSearchUpdate: (callback) =>
    ipcRenderer.on("search-update", (_event, data) => callback(data)),
  removeSearchListeners: () =>
    ipcRenderer.removeAllListeners("search-update"),
});
