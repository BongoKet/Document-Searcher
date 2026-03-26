const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let pythonProcess = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks if the app is running from a packaged executable or development
 */
function isPackaged() {
  return app.isPackaged;
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 850,
    minHeight: 600,
    backgroundColor: "#0f1117",
    // This sets the icon for the window and taskbar during development
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("closed", () => {
    killPython();
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  killPython();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------------------------------------------------------------------------
// Python process management
// ---------------------------------------------------------------------------

function getPythonPath() {
  if (isPackaged()) {
    // When packaged, search.exe should be in the 'resources/python' folder
    return path.join(process.resourcesPath, "python", "search.exe");
  }
  // During development
  return process.platform === "win32" ? "python" : "python3";
}

function spawnPython() {
  const args = isPackaged() 
    ? [] 
    : [path.join(__dirname, "python", "search.py")];
  
  const cmd = isPackaged() 
    ? getPythonPath() 
    : getPythonCmd();

  // If using a raw python script in dev, we need unbuffered output (-u)
  const spawnArgs = isPackaged() ? [] : ["-u", ...args];

  const proc = spawn(cmd, spawnArgs);
  let buffer = "";

  proc.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // Keep partial line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (mainWindow) {
          mainWindow.webContents.send("search-update", msg);
        }
      } catch (_) {}
    }
  });

  proc.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text && mainWindow) {
      mainWindow.webContents.send("search-update", {
        type: "error",
        message: text,
      });
    }
  });

  proc.on("close", (code) => {
    pythonProcess = null;
    if (buffer.trim() && mainWindow) {
      try {
        const msg = JSON.parse(buffer.trim());
        mainWindow.webContents.send("search-update", msg);
      } catch (_) {}
    }
  });

  return proc;
}

function getPythonCmd() {
  return process.platform === "win32" ? "python" : "python3";
}

function killPython() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle("select-folder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select folder to search",
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("open-file", async (_event, filePath) => {
  const err = await shell.openPath(filePath);
  return err || null;
});

ipcMain.on("start-search", (_event, options) => {
  killPython();
  pythonProcess = spawnPython();
  pythonProcess.stdin.write(
    JSON.stringify({ type: "search", ...options }) + "\n"
  );
});

ipcMain.on("stop-search", () => {
  killPython();
});