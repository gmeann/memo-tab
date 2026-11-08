import { contextBridge } from "electron";

// A narrow, typed bridge will be added here when local persistence is implemented.
contextBridge.exposeInMainWorld("memoTab", {
  platform: process.platform,
  version: "0.1.0"
});