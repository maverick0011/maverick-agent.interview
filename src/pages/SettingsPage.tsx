import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Volume2, 
  Mic, 
  Keyboard, 
  Download, 
  Upload, 
  Trash2, 
  Save, 
  Check,
  Cpu,
  Monitor
} from 'lucide-react';
import { localStore } from '../database/localStore';
import { AppSettings, AnswerMode } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(localStore.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupJSON, setBackupJSON] = useState('');

  const handleSave = () => {
    localStore.updateSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportBackup = () => {
    const jsonStr = localStore.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maverick-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const success = localStore.importFullBackup(content);
      if (success) {
        alert('Database restored successfully from backup!');
        setSettings(localStore.getSettings());
      } else {
        alert('Invalid backup JSON format.');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeData = () => {
    if (window.confirm('WARNING: This will wipe all local SQLite data, resumes, runbooks, and meeting histories. Proceed?')) {
      localStore.wipeAllData();
      alert('All local database records wiped.');
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Application Settings</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure local macOS desktop integration, audio capture, and air-gapped privacy parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Preferences Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* 1. General & Copilot Defaults */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          General & Copilot Behavior
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-300 block mb-1">Default Answer Mode</label>
            <select
              value={settings.defaultAnswerMode}
              onChange={e => setSettings({ ...settings, defaultAnswerMode: e.target.value as AnswerMode })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="senior">Senior Engineer Mode (Structured & Practical)</option>
              <option value="crisp">Crisp & Direct (1-2 Sentences)</option>
              <option value="star">STAR Format (Situation, Task, Action, Result)</option>
              <option value="troubleshooting">Step-by-Step Incident Troubleshooting</option>
              <option value="architecture">Deep Architecture Breakdown</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-neutral-300 block mb-1">Theme</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className="flex-1 py-2 text-xs rounded-xl bg-neutral-950 border border-indigo-500 text-white font-semibold"
              >
                macOS Dark Graphite
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Audio & ScreenCaptureKit Integration */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          macOS Audio & Speech Recognition
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-xs">
            <div>
              <div className="font-semibold text-white">System Audio Capture (ScreenCaptureKit)</div>
              <div className="text-neutral-400 text-[11px]">
                Captures interviewer audio during Zoom, Google Meet, or Teams video calls.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.systemAudioCaptureEnabled}
              onChange={e => setSettings({ ...settings, systemAudioCaptureEnabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-xs">
            <div>
              <div className="font-semibold text-white">Screen Sharing Privacy Shield</div>
              <div className="text-neutral-400 text-[11px]">
                Hides floating HUD window when sharing your screen in video meetings via macOS window protection.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.screenSharePrivacyEnabled}
              onChange={e => setSettings({ ...settings, screenSharePrivacyEnabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Global Shortcuts */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-400" />
          Global Keyboard Shortcuts
        </h2>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center justify-between">
            <span className="text-neutral-300">Toggle Floating Copilot HUD</span>
            <kbd className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-indigo-300 font-mono text-[11px] rounded-md">
              ⌘ + Shift + Space
            </kbd>
          </div>
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center justify-between">
            <span className="text-neutral-300">Quick Focus & Ask AI</span>
            <kbd className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-indigo-300 font-mono text-[11px] rounded-md">
              ⌘ + Shift + A
            </kbd>
          </div>
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center justify-between">
            <span className="text-neutral-300">Pause / Resume Audio Capture</span>
            <kbd className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-indigo-300 font-mono text-[11px] rounded-md">
              ⌘ + Shift + P
            </kbd>
          </div>
        </div>
      </div>

      {/* 4. Local Database Backup & Restore */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Local Data Architecture & Privacy
        </h2>

        <p className="text-xs text-neutral-400 leading-relaxed">
          All resumes, interview recordings, transcripts, system designs, and model configurations are 
          stored strictly on your machine. You can export a snapshot backup at any time or wipe the database completely.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-xl text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Full Backup (JSON)</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-xl text-xs font-medium cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Restore From Backup</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleWipeData}
            className="flex items-center gap-1.5 px-4 py-2 text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 rounded-xl text-xs font-medium transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe Local Database</span>
          </button>
        </div>
      </div>
    </div>
  );
};
