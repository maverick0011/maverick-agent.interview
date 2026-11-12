/**
 * Maverick AI - Electron Preload Script
 * Context-isolated secure bridge between Native macOS and React Renderer
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface MaverickNativeAPI {
  isElectron: boolean;
  platform: string;
  checkPermissions: () => Promise<{ mic: string; screen: string; systemAudio: string }>;
  requestMicPermission: () => Promise<boolean>;
  getSystemTelemetry: () => Promise<{
    platform: string;
    arch: string;
    totalMemoryGB: number;
    freeMemoryGB: number;
    isAppleSilicon: boolean;
  }>;
  setPrivacyProtection: (enable: boolean) => Promise<boolean>;
  minimizeFloating: () => Promise<void>;
  setOpacity: (opacity: number) => Promise<void>;
  launchOllamaTerminal: () => Promise<{ success: boolean; message?: string; error?: string }>;
  onQuickAskShortcut: (callback: () => void) => () => void;
}

const nativeAPI: MaverickNativeAPI = {
  isElectron: true,
  platform: process.platform,
  checkPermissions: () => ipcRenderer.invoke('system:check-permissions'),
  requestMicPermission: () => ipcRenderer.invoke('system:request-mic-permission'),
  getSystemTelemetry: () => ipcRenderer.invoke('system:get-telemetry'),
  setPrivacyProtection: (enable: boolean) => ipcRenderer.invoke('window:set-privacy-protection', enable),
  minimizeFloating: () => ipcRenderer.invoke('window:minimize-floating'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('window:set-opacity', opacity),
  launchOllamaTerminal: () => ipcRenderer.invoke('ollama:launch'),
  onQuickAskShortcut: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:quick-ask', handler);
    return () => ipcRenderer.removeListener('shortcut:quick-ask', handler);
  },
};

contextBridge.exposeInMainWorld('maverickNative', nativeAPI);
