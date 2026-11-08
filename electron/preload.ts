import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("memoTab", {
  platform: process.platform,
  version: "0.4.0",
  loadState: () => ipcRenderer.invoke("memo-tab:load-state"),
  saveState: (state: unknown) => ipcRenderer.invoke("memo-tab:save-state", state),
  getStoragePath: () => ipcRenderer.invoke("memo-tab:get-storage-path"),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke("memo-tab:set-always-on-top", enabled)
});