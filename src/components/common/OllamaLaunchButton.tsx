import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Sparkles,
  Cpu
} from 'lucide-react';
import { ollamaLauncher, LauncherStatus } from '../../services/ollamaLauncherService';
import { ollamaService } from '../../services/ollamaService';

interface OllamaLaunchButtonProps {
  className?: string;
  variant?: 'compact' | 'standard' | 'prominent';
}

export const OllamaLaunchButton: React.FC<OllamaLaunchButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const [status, setStatus] = useState<LauncherStatus>('idle');
  const [statusLabel, setStatusLabel] = useState<string>('Launch Ollama & Qwen3');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial state
    const probe = async () => {
      const state = await ollamaLauncher.checkState();
      if (!isMounted) return;
      setIsOnline(state.isRunning);
      if (state.isRunning) {
        setStatus('ready');
        setStatusLabel(state.hasQwen3 ? '✓ Qwen3 8B Active' : '⚡ Load Qwen3 8B');
      } else {
        setStatus('idle');
        setStatusLabel(variant === 'compact' ? 'Launch Ollama' : 'Launch Ollama & Qwen3');
      }
    };
    probe();

    // Subscribe to launcher state broadcasts
    const unsub = ollamaLauncher.subscribe(state => {
      if (!isMounted) return;
      setIsOnline(state.isRunning);
      if (state.isRunning) {
        setStatus('ready');
        setStatusLabel('✓ Qwen3 8B Active');
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [variant]);

  const handleLaunchClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If already active, running a live latency benchmark directly in the button
    if (status === 'ready') {
      setStatus('benchmarking');
      setStatusLabel('Benchmarking Latency...');
      const ms = await ollamaService.testLatency('qwen3:8b-q4_K_M');
      setStatusLabel(`✓ Qwen3 8B Active (${ms}ms)`);
      setTimeout(() => {
        setStatus('ready');
        setStatusLabel('✓ Qwen3 8B Active');
      }, 2500);
      return;
    }

    // Automatically trigger launch with in-button status progression
    await ollamaLauncher.launchOrInstall((newStatus, message) => {
      setStatus(newStatus);
      setStatusLabel(message);
      if (newStatus === 'ready') {
        setIsOnline(true);
      }
    });
  };

  const isPending =
    status === 'checking' ||
    status === 'launching_daemon' ||
    status === 'pulling_qwen' ||
    status === 'installing_ollama' ||
    status === 'benchmarking';

  const isSuccess = status === 'ready';

  return (
    <button
      onClick={handleLaunchClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 transition-all font-mono font-medium rounded-md select-none shrink-0 ${
        isSuccess
          ? 'bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 shadow-sm cursor-pointer'
          : isPending
          ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/50 cursor-wait animate-pulse'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm border border-indigo-400/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
      } ${
        variant === 'compact'
          ? 'px-2.5 py-1 text-[11px]'
          : variant === 'prominent'
          ? 'px-4 py-2 text-xs font-semibold'
          : 'px-3 py-1.5 text-xs'
      } ${className}`}
      title={
        isSuccess
          ? 'Qwen3 8B Q4 model is running and active. Click to run latency test.'
          : 'Click to automatically launch Ollama and Qwen3 8B model.'
      }
    >
      {isPending ? (
        <RefreshCw className="w-3 h-3 animate-spin text-indigo-300 shrink-0" />
      ) : isSuccess ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
      ) : (
        <Play className="w-3 h-3 fill-white text-white shrink-0" />
      )}

      <span className="truncate">
        {statusLabel}
      </span>
    </button>
  );
};
