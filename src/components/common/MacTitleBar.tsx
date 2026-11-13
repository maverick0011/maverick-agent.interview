import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Activity, 
  Layers, 
  Stethoscope, 
  User, 
  ShieldCheck, 
  Monitor, 
  Minus, 
  Square, 
  X,
  Lock,
  Globe
} from 'lucide-react';
import { localStore } from '../../database/localStore';
import { ollamaService } from '../../services/ollamaService';
import { ollamaLauncher } from '../../services/ollamaLauncherService';
import { OllamaLaunchButton } from './OllamaLaunchButton';
import { UserProfile, PlatformOS } from '../../types';

interface MacTitleBarProps {
  onToggleFloating: () => void;
  onOpenModelDoctor: () => void;
  onOpenWizard: () => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  isFloatingOpen: boolean;
  currentUser: UserProfile;
}

export const MacTitleBar: React.FC<MacTitleBarProps> = ({
  onToggleFloating,
  onOpenModelDoctor,
  onOpenWizard,
  onOpenAuth,
  onOpenAdmin,
  isFloatingOpen,
  currentUser,
}) => {
  const [modelName, setModelName] = useState('qwen3:8b-q4_K_M');
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);
  const [platformOS, setPlatformOS] = useState<PlatformOS>('macos');

  useEffect(() => {
    // Auto-detect OS from navigator
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (ua.includes('Win')) {
        setPlatformOS('windows');
      } else {
        setPlatformOS('macos');
      }
    }

    const settings = localStore.getSettings();
    setModelName(settings.primaryModel || 'qwen3:8b-q4_K_M');

    const checkOllama = async () => {
      const conn = await ollamaService.checkConnection();
      setIsOllamaOnline(conn.isOnline);
    };
    checkOllama();
    const interval = setInterval(checkOllama, 6000);

    const unsub = ollamaLauncher.subscribe(st => {
      setIsOllamaOnline(st.isRunning);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  return (
    <header className="h-11 bg-neutral-950/90 border-b border-neutral-800/80 px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Zone 1: Window Controls + Brand + Domain */}
      <div className="flex items-center gap-3">
        {/* macOS Traffic Lights (if on macOS) */}
        {platformOS === 'macos' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 cursor-pointer hover:opacity-80" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 cursor-pointer hover:opacity-80" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50 cursor-pointer hover:opacity-80" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-white font-sans">
            MAVERICK AI
          </span>
          <span className="text-neutral-600">/</span>
          <span className="text-[11px] font-mono text-cyan-300 hidden sm:inline flex items-center gap-1">
            <Globe className="w-3 h-3 text-cyan-400" />
            interview.cloudnativeacademy.in
          </span>
        </div>

        {/* Windows / macOS switcher toggle */}
        <button
          onClick={() => setPlatformOS(p => (p === 'macos' ? 'windows' : 'macos'))}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Toggle Windows / macOS Layout Style"
        >
          {platformOS === 'macos' ? ' macOS' : '⊞ Windows'}
        </button>
      </div>

      {/* Zone 2: Telemetry / Active Model Spec */}
      <div className="hidden md:flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md">
          <span className="font-mono text-neutral-400">Model:</span>
          <span className="font-mono text-indigo-300 font-medium">{modelName}</span>
          <span className="text-neutral-500">·</span>
          <span className="font-mono text-neutral-400">Ollama:</span>
          <span className={`font-mono text-[11px] ${isOllamaOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOllamaOnline ? 'localhost:11434' : 'Connecting...'}
          </span>
          <OllamaLaunchButton variant="compact" />
        </div>
      </div>

      {/* Zone 3: Quick Utilities + User Profile & Admin Trigger + Windows controls */}
      <div className="flex items-center gap-2">
        {/* Google Account Profile button */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
            currentUser.role === 'admin'
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:text-white'
          }`}
          title="Google Account & Profile"
        >
          {currentUser.role === 'admin' ? (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <User className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="max-w-[130px] truncate">
            {currentUser.role === 'admin' ? 'Admin: ' : ''}{currentUser.fullName}
          </span>
        </button>

        {/* Admin Dashboard Trigger */}
        {currentUser.role === 'admin' && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-md shadow-sm transition-colors"
            title="Admin Command Center: Assessments & Candidate Activity"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            <span>Admin Dashboard</span>
          </button>
        )}

        {/* Model Doctor */}
        <button
          onClick={onOpenModelDoctor}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-md transition-colors"
          title="Run Model & Hardware Health Diagnostics"
        >
          <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Doctor</span>
        </button>

        {/* Floating HUD */}
        <button
          onClick={onToggleFloating}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
            isFloatingOpen
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-200'
          }`}
          title={
            platformOS === 'windows'
              ? 'Open Floating HUD Assistant (Ctrl+Shift+Space)'
              : 'Open Floating HUD Assistant (Cmd+Shift+Space)'
          }
        >
          <Layers className="w-3.5 h-3.5 text-indigo-300" />
          <span>{isFloatingOpen ? 'HUD Active' : 'Floating HUD'}</span>
        </button>

        {/* Windows style Window Controls (if platformOS is windows) */}
        {platformOS === 'windows' && (
          <div className="flex items-center ml-2 border-l border-neutral-800 pl-2">
            <button className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded">
              <Minus className="w-3 h-3" />
            </button>
            <button className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded">
              <Square className="w-3 h-3" />
            </button>
            <button className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/50 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
