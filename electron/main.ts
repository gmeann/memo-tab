import { app, BrowserWindow } from "electron";
import path from "node:path";

const isDev = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 760,
    minHeight: 560,
    title: "Memo Tab",
    backgroundColor: "#f5f5f7",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    void window.loadURL("http://127.0.0.1:5173");
  } else {
    void window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});