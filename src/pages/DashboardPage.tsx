import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Cpu, 
  HardDrive, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  BookOpen, 
  UserCheck, 
  Network, 
  Code2,
  Stethoscope,
  Activity,
  Layers
} from 'lucide-react';
import { localStore } from '../database/localStore';
import { ollamaService } from '../services/ollamaService';
import { ollamaLauncher } from '../services/ollamaLauncherService';
import { InterviewSession, AIResponse, AppSettings } from '../types';
import { OllamaLaunchButton } from '../components/common/OllamaLaunchButton';
import { getActiveCopilotSessionConfig } from '../components/copilot/CreateSessionModal';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onOpenModelDoctor: () => void;
  onToggleFloating: () => void;
  onOpenCreateSession?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenModelDoctor,
  onToggleFloating,
  onOpenCreateSession,
}) => {
  const activeSessionConfig = getActiveCopilotSessionConfig();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [recentResponses, setRecentResponses] = useState<AIResponse[]>([]);
  const [settings, setSettings] = useState<AppSettings>(localStore.getSettings());
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);
  const [ollamaVersion, setOllamaVersion] = useState('0.5.x');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    setSessions(localStore.getSessions());
    setRecentResponses(localStore.getAIResponses().slice(0, 4));

    const checkStatus = async () => {
      const conn = await ollamaService.checkConnection();
      setIsOllamaOnline(conn.isOnline);
      if (conn.version) setOllamaVersion(conn.version);

      const lat = await ollamaService.testLatency(settings.primaryModel || 'qwen3:8b-q4_K_M');
      setLatencyMs(lat);
    };
    checkStatus();

    const unsub = ollamaLauncher.subscribe(st => {
      setIsOllamaOnline(st.isRunning);
      if (st.version) setOllamaVersion(st.version);
    });

    return () => unsub();
  }, [settings.primaryModel]);

  // Aggregate stats
  const totalDurationMin = Math.round(
    sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );
  const totalTranscripts = sessions.reduce(
    (acc, s) => acc + (s.transcripts?.length || 0),
    0
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950/40 border border-neutral-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
              <span>{activeSessionConfig.company ? `${activeSessionConfig.company} · ` : ''}{activeSessionConfig.targetRole}</span>
              <span aria-hidden="true">·</span>
              <span>Resume Grounding Ready</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight [text-wrap:balance]">
              Think Faster. Answer Smarter.
            </h1>
            <p className="text-sm text-neutral-400 max-w-xl">
              Launch a live interview copilot tailored to your resume and job description, run camera-proctored mock interviews, or pop out the discreet Floating HUD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenCreateSession && (
              <button
                onClick={onOpenCreateSession}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Session</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('copilot')}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-white rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Radio className="w-4 h-4 text-indigo-400" />
              <span>Live Copilot</span>
            </button>
            <button
              onClick={onToggleFloating}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Floating HUD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hardware & Model Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Primary Model */}
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1.5">
            <span className="font-medium">Primary Local LLM</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-base font-bold text-white font-mono truncate">
            {settings.primaryModel}
          </div>
          <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
            <span>Quantization: Q4_K_M</span>
            <span className="text-emerald-400 font-mono">4.8 GB</span>
          </div>
        </div>

        {/* Card 2: Ollama Daemon */}
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-medium">Ollama Runtime</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white font-mono">
                {isOllamaOnline ? 'Active' : 'Offline'}
              </span>
              <span className="text-xs text-neutral-400 font-mono">v{ollamaVersion}</span>
            </div>
            <OllamaLaunchButton variant="compact" />
          </div>
          <div className="text-xs text-neutral-400 pt-1 flex items-center justify-between border-t border-neutral-850">
            <span>Latency: {latencyMs ? `${latencyMs}ms` : 'Measuring...'}</span>
            <button
              onClick={onOpenModelDoctor}
              className="text-indigo-400 hover:underline text-[11px]"
            >
              Diagnose
            </button>
          </div>
        </div>

        {/* Card 3: Memory Footprint */}
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1.5">
            <span className="font-medium">MacBook Memory</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            16 GB Unified
          </div>
          <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
            <span>Headroom: ~11.2 GB</span>
            <span className="text-cyan-300 font-mono">Optimal</span>
          </div>
        </div>

        {/* Card 4: Historical Stats */}
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1.5">
            <span className="font-medium">Meeting History</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            {totalDurationMin} min logged
          </div>
          <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
            <span>{sessions.length} sessions saved</span>
            <span className="font-mono text-neutral-300">{totalTranscripts} segments</span>
          </div>
        </div>
      </div>

      {/* Quick Launchpad */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">
          Specialized Workspaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate('prep')}
            className="p-4 bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Interview Prep Hub</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              DevOps, SRE, AWS, and Kubernetes troubleshooting deep dives.
            </p>
          </button>

          <button
            onClick={() => onNavigate('mock')}
            className="p-4 bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Mock Interview Studio</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Real-time simulated voice/text evaluation across 5 hiring criteria.
            </p>
          </button>

          <button
            onClick={() => onNavigate('system-design')}
            className="p-4 bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-cyan-500/10 text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">System Design Studio</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Interactive visual architecture with Mermaid diagram rendering.
            </p>
          </button>

          <button
            onClick={() => onNavigate('coding')}
            className="p-4 bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-violet-500/10 text-violet-400 mb-3 group-hover:scale-105 transition-transform">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Coding Assistant</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Python, Bash, Terraform HCL, and K8s YAML generator with safety guards.
            </p>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Recent AI Answers & Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Grounded Answers */}
        <div className="p-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Recent AI Answers (Grounded)
            </h3>
            <span className="text-xs text-neutral-500 font-mono">Qwen3 8B</span>
          </div>

          <div className="space-y-3">
            {recentResponses.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-xl">
                No recent responses. Start a Live Copilot session or Mock Interview to generate answers.
              </div>
            ) : (
              recentResponses.map(resp => (
                <div
                  key={resp.id}
                  className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300 truncate max-w-[280px]">
                      {resp.questionText}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {resp.mode} · {resp.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                    {resp.answerText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Sessions */}
        <div className="p-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recent Copilot Sessions
            </h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {sessions.slice(0, 3).map(session => (
              <div
                key={session.id}
                className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{session.title}</span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {Math.round(session.durationSeconds / 60)} min
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span>{session.role}</span>
                  {session.company && (
                    <>
                      <span>·</span>
                      <span>{session.company}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
                {session.summary && (
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                    {session.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
