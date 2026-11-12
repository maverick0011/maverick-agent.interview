/**
 * Topic & Tool Selection Component
 * Allows candidates to select Interview Track, Seniority Level, and specific DevOps/Cloud Tools:
 * Linux, Shell Scripting, Jenkins, AWS, GCP, Docker, Kubernetes, Argo CD, Karpenter, Python.
 */

import React from 'react';
import { 
  Terminal, 
  Cpu, 
  Server, 
  Cloud, 
  Box, 
  GitBranch, 
  Code, 
  Layers, 
  Zap, 
  Sliders, 
  Clock, 
  Volume2, 
  CheckSquare, 
  Square,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  InterviewTrack, 
  SeniorityLevel, 
  ToolTopic, 
  InterviewSessionConfig 
} from '../types';
import { TOOL_TOPICS } from '../services/questionBank';

interface TopicSelectorProps {
  config: InterviewSessionConfig;
  onChangeConfig: (config: InterviewSessionConfig) => void;
  onProceedToPreCheck: () => void;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({
  config,
  onChangeConfig,
  onProceedToPreCheck,
}) => {
  const tracks: { id: InterviewTrack; label: string; desc: string }[] = [
    { 
      id: 'devops', 
      label: 'DevOps Engineer', 
      desc: 'CI/CD orchestration, automated security gates, infrastructure as code, and artifact pipelines' 
    },
    { 
      id: 'sre', 
      label: 'Site Reliability (SRE)', 
      desc: 'SLIs/SLOs, error budgets, incident command, Linux kernel tuning, and multi-region resilience' 
    },
    { 
      id: 'kubernetes', 
      label: 'Kubernetes Specialist', 
      desc: 'Control plane internals, CNI/CSI, RBAC, eBPF telemetry, and multi-tenant security' 
    },
    { 
      id: 'platform', 
      label: 'Cloud Platform Architect', 
      desc: 'Developer platforms, enterprise cloud governance, shared VPCs, and autoscaling' 
    },
    { 
      id: 'behavioral', 
      label: 'Engineering Leadership & Behavioral', 
      desc: 'Conflict resolution, postmortems, stakeholder alignment, and cross-functional leadership' 
    },
  ];

  const seniorities: { id: SeniorityLevel; label: string }[] = [
    { id: 'beginner', label: 'Associate / Junior' },
    { id: 'intermediate', label: 'Mid-Level' },
    { id: 'senior', label: 'Senior' },
    { id: 'staff', label: 'Staff / Principal' },
    { id: 'mixed', label: 'Mixed Difficulty' },
  ];

  // Map tool icons and descriptions
  const toolIcons: Record<ToolTopic, React.ReactNode> = {
    'Linux': <Terminal className="w-4 h-4 text-amber-400" />,
    'Shell Scripting': <Code className="w-4 h-4 text-emerald-400" />,
    'Jenkins': <GitBranch className="w-4 h-4 text-rose-400" />,
    'AWS': <Cloud className="w-4 h-4 text-amber-500" />,
    'GCP': <Cloud className="w-4 h-4 text-blue-400" />,
    'Docker': <Box className="w-4 h-4 text-cyan-400" />,
    'Kubernetes': <Layers className="w-4 h-4 text-indigo-400" />,
    'Argo CD': <Zap className="w-4 h-4 text-rose-300" />,
    'Karpenter': <Cpu className="w-4 h-4 text-emerald-300" />,
    'Python': <Code className="w-4 h-4 text-yellow-400" />,
  };

  const handleToggleTopic = (topic: ToolTopic) => {
    let updated: ToolTopic[];
    if (config.selectedTopics.includes(topic)) {
      if (config.selectedTopics.length === 1) return; // Must keep at least one
      updated = config.selectedTopics.filter(t => t !== topic);
    } else {
      updated = [...config.selectedTopics, topic];
    }
    onChangeConfig({ ...config, selectedTopics: updated });
  };

  const handleSelectAllTopics = () => {
    onChangeConfig({ ...config, selectedTopics: [...TOOL_TOPICS] });
  };

  return (
    <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-7 animate-fade-in">
      {/* Step 1: Select Track */}
      <div>
        <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-3 flex items-center justify-between">
          <span>1. Select Interview Track</span>
          <span className="text-[11px] text-neutral-500 font-normal">Primary engineering discipline</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.map(t => (
            <button
              key={t.id}
              onClick={() => onChangeConfig({ ...config, track: t.id })}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.track === t.id
                  ? 'bg-neutral-850 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                  : 'bg-neutral-950/60 hover:bg-neutral-850/50 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{t.label}</span>
                {config.track === t.id && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              <p className="text-xs text-neutral-400 line-clamp-2">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Select Seniority */}
      <div>
        <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-3 flex items-center justify-between">
          <span>2. Select Target Seniority</span>
          <span className="text-[11px] text-neutral-500 font-normal">Calibrates expected depth and failure scenario complexity</span>
        </label>
        <div className="flex flex-wrap gap-2.5">
          {seniorities.map(s => (
            <button
              key={s.id}
              onClick={() => onChangeConfig({ ...config, seniority: s.id })}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                config.seniority === s.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-neutral-950 hover:bg-neutral-850 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Tool-Level Interviews (Multi-select) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <span>3. Select Tool-Level Interview Topics</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {config.selectedTopics.length} Selected
            </span>
          </label>
          <button
            onClick={handleSelectAllTopics}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Select All 10 Tools
          </button>
        </div>

        <p className="text-xs text-neutral-400 mb-3">
          Questions will be evenly drawn exclusively from your selected tools. Unselected topics are strictly excluded.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TOOL_TOPICS.map(topic => {
            const isSelected = config.selectedTopics.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => handleToggleTopic(topic)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  isSelected
                    ? 'bg-neutral-850 border-indigo-500/80 shadow-sm text-white'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="shrink-0 p-1 rounded-md bg-neutral-900 border border-neutral-800">
                  {toolIcons[topic]}
                </div>
                <span className="text-xs font-semibold truncate flex-1">{topic}</span>
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 4: Session Runtime Parameters */}
      <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="text-neutral-400 block mb-1 font-medium">Questions per Round</label>
          <select
            value={config.questionCount}
            onChange={e => onChangeConfig({ ...config, questionCount: Number(e.target.value) })}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value={5}>5 Questions (Express Round)</option>
            <option value={8}>8 Questions (Standard)</option>
            <option value={10}>10 Questions (Full Assessment)</option>
            <option value={15}>15 Questions (Deep Technical)</option>
          </select>
        </div>

        <div>
          <label className="text-neutral-400 block mb-1 font-medium">Time per Answer</label>
          <select
            value={config.timePerAnswerSec}
            onChange={e => onChangeConfig({ ...config, timePerAnswerSec: Number(e.target.value) })}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value={60}>60 Seconds (Rapid Fire)</option>
            <option value={90}>90 Seconds</option>
            <option value={120}>120 Seconds (Recommended)</option>
            <option value={180}>180 Seconds (In-depth Architecture)</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white">
            <input
              type="checkbox"
              checked={config.readAloud}
              onChange={e => onChangeConfig({ ...config, readAloud: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded"
            />
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Read Questions Aloud (TTS)</span>
          </label>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onProceedToPreCheck}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <span>Continue to Camera & Hardware Pre-Check</span>
        </button>
      </div>
    </div>
  );
};
