const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");

const DEFAULT_SETTINGS = {
  general: { caseSensitive: false, maxResults: 10000, truncateLength: 500 },
  fileTypes: { excel: true, word: true, pdf: true },
  indexing: { enabled: true, dbPath: "", autoIndex: false },
  appearance: { theme: "dark" },
  updates: { autoCheck: true, channel: "latest" },
  history: { maxEntries: 100 },
};

const store = new Store({
  defaults: {
    settings: DEFAULT_SETTINGS,
    history: [],
  },
});

const windows = new Map();
let windowIdCounter = 0;

function isDev() {
  return !app.isPackaged;
}

function createWindow() {
  const id = ++windowIdCounter;
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 850,
    minHeight: 600,
    backgroundColor: "#0f1117",
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  windows.set(id, { win, pythonProcess: null, buffer: "" });

  if (isDev()) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
  }

  win.once("ready-to-show", () => win.show());

  win.on("closed", () => {
    const entry = windows.get(id);
    if (entry && entry.pythonProcess) {
      entry.pythonProcess.kill();
    }
    windows.delete(id);
  });

  return win;
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => createWindow(),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  setupAutoUpdater();
});

app.on("window-all-closed", () => {
  for (const [, entry] of windows) {
    if (entry.pythonProcess) entry.pythonProcess.kill();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------------------------------------------------------------------------
// Python process management
// ---------------------------------------------------------------------------

function getPythonCommand() {
  if (app.isPackaged) {
    const ext = process.platform === "win32" ? ".exe" : "";
    return { cmd: path.join(process.resourcesPath, "python", `search${ext}`), args: [] };
  }
  const cmd = process.platform === "win32" ? "python" : "python3";
  return { cmd, args: ["-u", path.join(__dirname, "..", "python", "search.py")] };
}

function getWindowEntry(event) {
  for (const [, entry] of windows) {
    if (entry.win.webContents === event.sender) return entry;
  }
  return null;
}

function spawnPython(entry) {
  if (entry.pythonProcess) {
    entry.pythonProcess.kill();
    entry.pythonProcess = null;
  }

  const { cmd, args } = getPythonCommand();
  const proc = spawn(cmd, args);
  entry.buffer = "";

  proc.stdout.on("data", (chunk) => {
    entry.buffer += chunk.toString();
    const lines = entry.buffer.split("\n");
    entry.buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (!entry.win.isDestroyed()) {
          entry.win.webContents.send("search-update", msg);
        }
      } catch (_) {}
    }
  });

  proc.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text && !entry.win.isDestroyed()) {
      entry.win.webContents.send("search-update", { type: "error", message: text });
    }
  });

  proc.on("close", () => {
    if (entry.buffer.trim() && !entry.win.isDestroyed()) {
      try {
        const msg = JSON.parse(entry.buffer.trim());
        entry.win.webContents.send("search-update", msg);
      } catch (_) {}
    }
    entry.pythonProcess = null;
  });

  entry.pythonProcess = proc;
  return proc;
}

function sendToPython(entry, data) {
  if (entry.pythonProcess && entry.pythonProcess.stdin.writable) {
    entry.pythonProcess.stdin.write(JSON.stringify(data) + "\n");
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle("select-folder", async (event) => {
  const entry = getWindowEntry(event);
  if (!entry) return null;
  const result = await dialog.showOpenDialog(entry.win, {
    title: "Select folder to search",
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-folders", async (event) => {
  const entry = getWindowEntry(event);
  if (!entry) return [];
  const result = await dialog.showOpenDialog(entry.win, {
    title: "Select folders to search",
    properties: ["openDirectory", "multiSelections"],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("open-file", async (_event, filePath) => {
  const err = await shell.openPath(filePath);
  return err || null;
});

ipcMain.on("start-search", (event, options) => {
  const entry = getWindowEntry(event);
  if (!entry) return;
  spawnPython(entry);
  sendToPython(entry, { type: "search", ...options });
});

ipcMain.on("stop-search", (event) => {
  const entry = getWindowEntry(event);
  if (!entry) return;
  if (entry.pythonProcess) {
    entry.pythonProcess.kill();
    entry.pythonProcess = null;
  }
});

ipcMain.on("request-preview", (event, data) => {
  const entry = getWindowEntry(event);
  if (!entry) return;
  if (!entry.pythonProcess) spawnPython(entry);
  sendToPython(entry, { type: "preview", ...data });
});

ipcMain.on("build-index", (event, data) => {
  const entry = getWindowEntry(event);
  if (!entry) return;
  if (!entry.pythonProcess) spawnPython(entry);
  sendToPython(entry, { type: "index", ...data });
});

ipcMain.handle("get-index-status", async (event, data) => {
  const entry = getWindowEntry(event);
  if (!entry) return null;
  if (!entry.pythonProcess) spawnPython(entry);
  sendToPython(entry, { type: "index_status", ...data });
  return null;
});

ipcMain.on("clear-index", (event) => {
  const entry = getWindowEntry(event);
  if (!entry) return;
  if (!entry.pythonProcess) spawnPython(entry);
  sendToPython(entry, { type: "clear_index" });
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

ipcMain.handle("get-settings", () => {
  return store.get("settings", DEFAULT_SETTINGS);
});

ipcMain.handle("set-settings", (_event, settings) => {
  store.set("settings", settings);
  return true;
});

ipcMain.handle("reset-settings", () => {
  store.set("settings", DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

ipcMain.handle("get-history", () => {
  return store.get("history", []);
});

ipcMain.handle("add-history", (_event, entry) => {
  const settings = store.get("settings", DEFAULT_SETTINGS);
  const max = settings.history?.maxEntries || 100;
  let history = store.get("history", []);
  history.unshift({ ...entry, timestamp: Date.now() });
  if (history.length > max) history = history.slice(0, max);
  store.set("history", history);
  return history;
});

ipcMain.handle("clear-history", () => {
  store.set("history", []);
  return [];
});

// ---------------------------------------------------------------------------
// Auto-update
// ---------------------------------------------------------------------------

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  const settings = store.get("settings", DEFAULT_SETTINGS);
  if (settings.updates?.autoCheck) {
    autoUpdater.checkForUpdates().catch(() => {});
  }

  autoUpdater.on("update-available", (info) => {
    for (const [, entry] of windows) {
      if (!entry.win.isDestroyed()) {
        entry.win.webContents.send("update-status", { type: "available", info });
      }
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    for (const [, entry] of windows) {
      if (!entry.win.isDestroyed()) {
        entry.win.webContents.send("update-status", { type: "downloaded", info });
      }
    }
  });

  autoUpdater.on("error", (err) => {
    for (const [, entry] of windows) {
      if (!entry.win.isDestroyed()) {
        entry.win.webContents.send("update-status", { type: "error", message: err.message });
      }
    }
  });
}

ipcMain.on("check-for-updates", () => {
  autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.on("download-update", () => {
  autoUpdater.downloadUpdate().catch(() => {});
});

ipcMain.on("install-update", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on("create-new-window", () => {
  createWindow();
});
