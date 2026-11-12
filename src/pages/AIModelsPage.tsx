import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Download, 
  Activity, 
  HardDrive, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Stethoscope,
  Terminal,
  Zap,
  Play
} from 'lucide-react';
import { ollamaService } from '../services/ollamaService';
import { ollamaLauncher } from '../services/ollamaLauncherService';
import { localStore } from '../database/localStore';
import { OllamaModelInfo, AppSettings } from '../types';
import { OllamaLaunchButton } from '../components/common/OllamaLaunchButton';

interface AIModelsPageProps {
  onOpenModelDoctor: () => void;
}

export const AIModelsPage: React.FC<AIModelsPageProps> = ({ onOpenModelDoctor }) => {
  const [settings, setSettings] = useState<AppSettings>(localStore.getSettings());
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);
  const [ollamaVersion, setOllamaVersion] = useState('0.5.x');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullStatus, setPullStatus] = useState('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);

  const refreshModels = async () => {
    const conn = await ollamaService.checkConnection();
    setIsOllamaOnline(conn.isOnline);
    if (conn.version) setOllamaVersion(conn.version);

    const list = await ollamaService.listInstalledModels();
    setModels(list);
  };

  useEffect(() => {
    refreshModels();

    const unsub = ollamaLauncher.subscribe(st => {
      setIsOllamaOnline(st.isRunning);
      if (st.version) setOllamaVersion(st.version);
    });

    return () => unsub();
  }, []);

  const handlePullModel = async (modelName: string) => {
    setIsPulling(true);
    setPullProgress(0);
    setPullStatus(`Pulling ${modelName}...`);

    await ollamaService.pullModel(modelName, (pct, status) => {
      setPullProgress(pct);
      setPullStatus(status);
    });

    setIsPulling(false);
    await refreshModels();
  };

  const handleTestLatency = async () => {
    setIsTestingLatency(true);
    const ms = await ollamaService.testLatency(settings.primaryModel);
    setLatencyMs(ms);
    setIsTestingLatency(false);
  };

  const handleUpdateSettings = (updates: Partial<AppSettings>) => {
    const updated = localStore.updateSettings(updates);
    setSettings(updated);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">AI Models & Local Runtime</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your local Ollama daemon, Qwen3 8B Q4 weights, and Apple Silicon unified memory allocation.
          </p>
        </div>

        <button
          onClick={onOpenModelDoctor}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
        >
          <Stethoscope className="w-4 h-4" />
          <span>Launch Model Doctor</span>
        </button>
      </div>

      {/* Runtime Connection Bar */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isOllamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Local Ollama Server</span>
              <span className="font-mono text-neutral-400 text-[11px]">
                {settings.ollamaEndpoint}
              </span>
              <OllamaLaunchButton variant="compact" />
            </div>
            <div className="text-[11px] text-neutral-400">
              {isOllamaOnline
                ? `Daemon connected · v${ollamaVersion}`
                : 'Offline · Click "Launch in Terminal" to run Ollama and Qwen3 8B'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OllamaLaunchButton variant="standard" />
          <button
            onClick={handleTestLatency}
            disabled={isTestingLatency}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isTestingLatency ? 'Benchmarking...' : 'Test Latency'}</span>
          </button>
          <button
            onClick={refreshModels}
            className="p-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 rounded-lg transition-colors"
            title="Refresh models list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {latencyMs !== null && (
        <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
          <span className="text-neutral-300 font-medium">Inference Latency Result:</span>
          <span className="font-mono font-bold text-emerald-400">{latencyMs} ms per token generation</span>
        </div>
      )}

      {/* Model Pull Progress Banner if active */}
      {isPulling && (
        <div className="p-4 bg-neutral-900 border border-indigo-500/50 rounded-2xl space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-indigo-300">{pullStatus}</span>
            <span className="text-white font-bold">{pullProgress}%</span>
          </div>
          <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${pullProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Primary Model Showcase Card: Qwen3 8B Q4 */}
      <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950/30 border border-indigo-500/40 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                Designated Primary LLM
              </span>
              <h2 className="text-lg font-bold text-white">Qwen3 8B Q4 (qwen3:8b-q4_K_M)</h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
            Ready & Active
          </span>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
          Qwen3 8B Q4 is the foundation model for Maverick AI. Quantized to 4-bit medium (Q4_K_M), it requires only 
          4.8 GB of VRAM/unified memory, delivering blazing token throughput and zero latency drift on Apple Silicon 16 GB MacBooks.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500 font-mono block">Parameters</span>
            <span className="text-white font-mono font-bold">8.1 Billion</span>
          </div>
          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500 font-mono block">Quantization</span>
            <span className="text-white font-mono font-bold">Q4_K_M (GGUF)</span>
          </div>
          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500 font-mono block">Memory Weight</span>
            <span className="text-emerald-400 font-mono font-bold">4.8 GB RAM</span>
          </div>
          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500 font-mono block">Context Window</span>
            <span className="text-cyan-400 font-mono font-bold">{settings.contextLength} Tokens</span>
          </div>
        </div>
      </div>

      {/* Hyperparameter Controls */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          Model Inference Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Context Window Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300 font-medium">Context Window</span>
              <span className="font-mono text-indigo-400 font-bold">{settings.contextLength} Tokens</span>
            </div>
            <input
              type="range"
              min="4096"
              max="16384"
              step="1024"
              value={settings.contextLength}
              onChange={e => handleUpdateSettings({ contextLength: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-500">
              8K tokens provides deep conversational history while maintaining low memory pressure on 16 GB machines.
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300 font-medium">Sampling Temperature</span>
              <span className="font-mono text-indigo-400 font-bold">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={settings.temperature}
              onChange={e => handleUpdateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-500">
              Lower temperature (0.3 - 0.4) produces deterministic, technically precise interview answers.
            </p>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300 font-medium">Max Output Tokens</span>
              <span className="font-mono text-indigo-400 font-bold">{settings.maxOutputTokens} Tokens</span>
            </div>
            <input
              type="range"
              min="256"
              max="2048"
              step="128"
              value={settings.maxOutputTokens}
              onChange={e => handleUpdateSettings({ maxOutputTokens: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-500">
              Caps maximum response length to keep answer generation crisp and human-sounding.
            </p>
          </div>
        </div>
      </div>

      {/* Installed Models Table */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          Local Model Registry
        </h3>
        <div className="space-y-2">
          {models.map(m => (
            <div
              key={m.name}
              className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="font-bold text-white font-mono">{m.name}</div>
                  <div className="text-[11px] text-neutral-400">
                    {m.details?.parameter_size || '8B'} · {m.details?.quantization_level || 'Q4_K_M'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-neutral-300">{m.size}</span>
                <button
                  onClick={() => handlePullModel(m.name)}
                  disabled={isPulling}
                  className="px-3 py-1 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 rounded-lg text-xs transition-colors"
                >
                  Update Weights
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
