import { contextBridge, ipcRenderer } from "electron";

export interface SyncployDesktopAPI {
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    nodeVersion: string;
    awsRegion: string;
    awsProfile: string;
    cwd: string;
    localOnly: boolean;
    dataRelay: string;
  }>;
  openUrl: (url: string) => Promise<boolean>;
}

const api: SyncployDesktopAPI = {
  getSystemInfo: () => ipcRenderer.invoke("syncploy:get-system-info"),
  openUrl: (url: string) => ipcRenderer.invoke("syncploy:open-url", url),
};

contextBridge.exposeInMainWorld("syncployDesktop", api);
