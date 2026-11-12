import React, { useState, useEffect } from 'react';
import { Sparkles, Activity, Layers, ExternalLink, Stethoscope } from 'lucide-react';
import { localStore } from '../../database/localStore';
import { ollamaService } from '../../services/ollamaService';
import { ollamaLauncher } from '../../services/ollamaLauncherService';
import { OllamaLaunchButton } from './OllamaLaunchButton';

interface MacTitleBarProps {
  onToggleFloating: () => void;
  onOpenModelDoctor: () => void;
  onOpenWizard: () => void;
  isFloatingOpen: boolean;
}

export const MacTitleBar: React.FC<MacTitleBarProps> = ({
  onToggleFloating,
  onOpenModelDoctor,
  onOpenWizard,
  isFloatingOpen,
}) => {
  const [modelName, setModelName] = useState('qwen3:8b-q4_K_M');
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);

  useEffect(() => {
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
      {/* Zone 1: Window Controls + Brand */}
      <div className="flex items-center gap-3">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 cursor-pointer hover:opacity-80" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 cursor-pointer hover:opacity-80" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50 cursor-pointer hover:opacity-80" />
        </div>

        <div className="h-4 w-px bg-neutral-800 ml-1" />

        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-white font-sans">
            MAVERICK AI
          </span>
          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
            1.0.0 · Local-First
          </span>
        </div>
      </div>

      {/* Zone 2: Telemetry / Active Model Spec */}
      <div className="hidden md:flex items-center gap-4 text-xs">
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

        <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
          <span className="font-mono text-neutral-300">16 GB RAM</span>
          <span>·</span>
          <span className="text-neutral-300">Apple Silicon Optimized</span>
        </div>
      </div>

      {/* Zone 3: Quick Utilities */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenModelDoctor}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-md transition-colors"
          title="Run Model & Hardware Health Diagnostics"
        >
          <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Model Doctor</span>
        </button>

        <button
          onClick={onToggleFloating}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
            isFloatingOpen
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-200'
          }`}
          title="Open Floating HUD Assistant (Cmd+Shift+Space)"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-300" />
          <span>{isFloatingOpen ? 'HUD Active' : 'Floating HUD'}</span>
        </button>
      </div>
    </header>
  );
};
