import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("ltt", {
  // ---- AUTH ----
  signIn: () => ipcRenderer.invoke("auth:signIn"),
  getSession: () => ipcRenderer.invoke("auth:getSession"),
  signOut: () => ipcRenderer.invoke("auth:signOut"),
  // ---- ENTRIES ----
  loadEntries: (userId) => ipcRenderer.invoke("entries:load", userId),
  saveEntry: (entry) => ipcRenderer.invoke("entries:save", entry),
  deleteEntry: (id) => ipcRenderer.invoke("entries:delete", id),
  // ---- TIMER ----
  startTimer: (entryId) => ipcRenderer.invoke("timer:start", entryId),
  pauseTimer: () => ipcRenderer.invoke("timer:pause"),
  stopTimer: () => ipcRenderer.invoke("timer:stop"),
  getTimerState: () => ipcRenderer.invoke("timer:getState"),
  flushTimer: () => ipcRenderer.invoke("timer:flush"),
  // ---- SETTINGS ----
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  pushSettings: (userId) => ipcRenderer.invoke("settings:push", userId),
  // ---- APP ----
  getDeletedIds: () => ipcRenderer.invoke("app:getDeletedIds"),
  addDeletedId: (id) => ipcRenderer.invoke("app:addDeletedId", id),
  // ---- EVENTS (main → renderer) ----
  on: (channel, fn) => ipcRenderer.on(channel, (_event, ...args) => fn(...args)),
  off: (channel, fn) => ipcRenderer.off(channel, fn)
});
