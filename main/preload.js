const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  selectFolders: () => ipcRenderer.invoke("select-folders"),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),

  startSearch: (options) => ipcRenderer.send("start-search", options),
  stopSearch: () => ipcRenderer.send("stop-search"),
  onSearchUpdate: (callback) =>
    ipcRenderer.on("search-update", (_event, data) => callback(data)),
  removeSearchListeners: () =>
    ipcRenderer.removeAllListeners("search-update"),

  requestPreview: (data) => ipcRenderer.send("request-preview", data),

  buildIndex: (data) => ipcRenderer.send("build-index", data),
  getIndexStatus: (data) => ipcRenderer.invoke("get-index-status", data),
  clearIndex: () => ipcRenderer.send("clear-index"),

  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (settings) => ipcRenderer.invoke("set-settings", settings),
  resetSettings: () => ipcRenderer.invoke("reset-settings"),

  getHistory: () => ipcRenderer.invoke("get-history"),
  addHistory: (entry) => ipcRenderer.invoke("add-history", entry),
  clearHistory: () => ipcRenderer.invoke("clear-history"),

  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  downloadUpdate: () => ipcRenderer.send("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),
  onUpdateStatus: (callback) =>
    ipcRenderer.on("update-status", (_event, data) => callback(data)),
  removeUpdateListeners: () =>
    ipcRenderer.removeAllListeners("update-status"),

  createNewWindow: () => ipcRenderer.send("create-new-window"),
});
