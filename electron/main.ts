/**
 * Maverick AI - Electron Main Process
 * macOS Native Desktop Integration with Apple Silicon / Intel Support
 */

import { app, BrowserWindow, ipcMain, globalShortcut, systemPreferences, dialog, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#0a0a0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFloatingWindow() {
  floatingWindow = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 360,
    minHeight: 400,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    hasShadow: true,
    vibrancy: 'hud',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Enable privacy mode (exclude from ScreenCapture/Zoom sharing if user configured)
  floatingWindow.setContentProtection(true);

  if (isDev) {
    floatingWindow.loadURL('http://localhost:3000/#/floating');
  } else {
    floatingWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/floating' });
  }

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });
}

function registerShortcuts() {
  // Toggle Floating Copilot HUD
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (floatingWindow) {
      if (floatingWindow.isVisible()) {
        floatingWindow.hide();
      } else {
        floatingWindow.show();
        floatingWindow.focus();
      }
    } else {
      createFloatingWindow();
    }
  });

  // Quick Ask AI focus shortcut
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (floatingWindow) {
      floatingWindow.show();
      floatingWindow.focus();
      floatingWindow.webContents.send('shortcut:quick-ask');
    }
  });
}

function setupIPC() {
  // macOS Permissions Check
  ipcMain.handle('system:check-permissions', async () => {
    if (process.platform !== 'darwin') {
      return { mic: 'granted', screen: 'granted', systemAudio: 'granted' };
    }

    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    const screenStatus = systemPreferences.getMediaAccessStatus('screen');

    return {
      mic: micStatus,
      screen: screenStatus,
      systemAudio: screenStatus === 'granted' ? 'granted' : 'prompt',
    };
  });

  ipcMain.handle('system:request-mic-permission', async () => {
    if (process.platform === 'darwin') {
      return await systemPreferences.askForMediaAccess('microphone');
    }
    return true;
  });

  // System Hardware / Memory Telemetry for MacBook Optimization
  ipcMain.handle('system:get-telemetry', async () => {
    const memory = process.getSystemMemoryInfo();
    return {
      platform: process.platform,
      arch: process.arch, // 'arm64' (Apple Silicon) or 'x64' (Intel)
      totalMemoryGB: Math.round(memory.total / (1024 * 1024)),
      freeMemoryGB: Math.round(memory.free / (1024 * 1024)),
      isAppleSilicon: process.arch === 'arm64' && process.platform === 'darwin',
    };
  });

  // Toggle Screen-Sharing Protection for Floating HUD
  ipcMain.handle('window:set-privacy-protection', async (_, enable: boolean) => {
    if (floatingWindow) {
      floatingWindow.setContentProtection(enable);
      return true;
    }
    return false;
  });

  // Floating Window Controls
  ipcMain.handle('window:minimize-floating', () => {
    if (floatingWindow) floatingWindow.hide();
  });

  ipcMain.handle('window:set-opacity', (_: any, opacity: number) => {
    if (floatingWindow) floatingWindow.setOpacity(opacity);
  });

  // Launch Ollama in macOS Terminal
  ipcMain.handle('ollama:launch', async () => {
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
      if (process.platform === 'darwin') {
        const cmd = `osascript -e 'tell application "Terminal" to do script "echo \\"=== MAVERICK AI: Launching Local Ollama & Qwen3 8B ===\\"; if command -v ollama >/dev/null 2>&1; then echo \\"Ollama is installed. Starting Qwen3 8B...\\"; ollama run qwen3:8b; else echo \\"Ollama not detected. Installing via official installer...\\"; curl -fsSL https://ollama.com/install.sh | sh && ollama run qwen3:8b; fi"'`;
        exec(cmd, (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, message: 'Launched Terminal running Ollama & Qwen3 8B' });
          }
        });
      } else {
        exec('ollama run qwen3:8b', (err) => {
          resolve({ success: !err, message: err ? err.message : 'Ollama command executed' });
        });
      }
    });
  });
}

app.whenReady().then(() => {
  createMainWindow();
  registerShortcuts();
  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
