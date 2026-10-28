import { contextBridge, ipcRenderer } from 'electron';
import type { OrganizerApi } from '../shared/types';

// Expose only specific, allow-listed operations. Do not expose ipcRenderer itself.
const organizerApi: OrganizerApi = {
  getSettings: () => ipcRenderer.invoke('organizer:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('organizer:save-settings', settings),
  chooseFolder: () => ipcRenderer.invoke('organizer:choose-folder'),
  preview: () => ipcRenderer.invoke('organizer:preview'),
  organize: () => ipcRenderer.invoke('organizer:organize'),
  undo: () => ipcRenderer.invoke('organizer:undo'),
};

contextBridge.exposeInMainWorld('organizer', organizerApi);


const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),

  toggleMaximize: () =>
    ipcRenderer.invoke('window:toggle-maximize'),

  close: () => ipcRenderer.invoke('window:close'),

  isMaximized: () =>
    ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,

  onMaximizedChanged: (
    callback: (maximized: boolean) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      maximized: boolean
    ) => callback(maximized);

    ipcRenderer.on('window:maximized-changed', listener);

    return () => {
      ipcRenderer.removeListener(
        'window:maximized-changed',
        listener
      );
    };
  },
};

contextBridge.exposeInMainWorld('windowControls', windowControls);