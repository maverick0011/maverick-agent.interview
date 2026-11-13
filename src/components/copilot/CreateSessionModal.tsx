/**
 * Create Interview Session Modal
 * Configures company, target role, job description, resume upload/context,
 * and response style before launching Live Copilot or Floating HUD.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Radio,
  Layers,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { localStore } from '../../database/localStore';
import { AnswerMode } from '../../types';

export interface ActiveCopilotSessionConfig {
  company: string;
  targetRole: string;
  jobDescription: string;
  answerMode: AnswerMode;
  language: string;
  updatedAt: string;
}

const SESSION_CONFIG_KEY = 'maverick_active_copilot_session_v1';

export function getActiveCopilotSessionConfig(): ActiveCopilotSessionConfig {
  const resume = localStore.getResume();
  const fallback: ActiveCopilotSessionConfig = {
    company: '',
    targetRole: resume.targetRole || 'Senior DevOps / SRE Engineer',
    jobDescription: '',
    answerMode: 'senior',
    language: 'English',
    updatedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(SESSION_CONFIG_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function saveActiveCopilotSessionConfig(cfg: ActiveCopilotSessionConfig): void {
  localStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(cfg));
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchCopilot: (openFloatingHud?: boolean) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onLaunchCopilot,
}) => {
  const initial = getActiveCopilotSessionConfig();
  const resume = localStore.getResume();

  const [company, setCompany] = useState(initial.company);
  const [targetRole, setTargetRole] = useState(initial.targetRole);
  const [jobDescription, setJobDescription] = useState(initial.jobDescription);
  const [resumeSummary, setResumeSummary] = useState(resume.summary);
  const [answerMode, setAnswerMode] = useState<AnswerMode>(initial.answerMode);
  const [language, setLanguage] = useState(initial.language);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const text = await file.text();
    const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 3500);
    if (cleaned) {
      setResumeSummary(cleaned);
    }
  };

  const persistAndLaunch = (openHud: boolean) => {
    const nextConfig: ActiveCopilotSessionConfig = {
      company: company.trim(),
      targetRole: targetRole.trim() || 'Senior DevOps / SRE Engineer',
      jobDescription: jobDescription.trim(),
      answerMode,
      language,
      updatedAt: new Date().toISOString(),
    };
    saveActiveCopilotSessionConfig(nextConfig);

    // Update active resume summary & target role
    const currentResume = localStore.getResume();
    localStore.saveResume({
      ...currentResume,
      targetRole: nextConfig.targetRole,
      summary: resumeSummary.trim() || currentResume.summary,
    });

    // Ground the job description into Knowledge Base for RAG retrieval
    if (nextConfig.jobDescription.length > 20) {
      const existingDocs = localStore.getKnowledgeDocs();
      const jdTitle = `Target JD · ${nextConfig.company ? `${nextConfig.company} — ` : ''}${nextConfig.targetRole}`;
      if (!existingDocs.some(d => d.title === jdTitle)) {
        const content = nextConfig.jobDescription;
        localStore.saveKnowledgeDoc({
          id: `jd_${Date.now()}`,
          title: jdTitle,
          category: 'notes',
          chunksCount: Math.max(1, Math.ceil(content.length / 400)),
          sizeBytes: new Blob([content]).size,
          lastIndexed: new Date().toISOString(),
          summary: `Target job description for ${nextConfig.targetRole}${nextConfig.company ? ` at ${nextConfig.company}` : ''}`,
          content,
        });
      }
    }

    onClose();
    onLaunchCopilot(openHud);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Configure Interview Copilot Session
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Bind your resume, target company, and job description so every live answer matches your background.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close session configurator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Target Company
              </label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g., Stripe, Datadog, Amazon"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g., Senior Site Reliability Engineer"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Default Response Style
              </label>
              <select
                value={answerMode}
                onChange={e => setAnswerMode(e.target.value as AnswerMode)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="senior">Senior Engineer (Balanced & Technical)</option>
                <option value="crisp">Crisp & Direct (Fast Glance Bullets)</option>
                <option value="star">STAR Behavioral Format</option>
                <option value="troubleshooting">Troubleshooting Triage</option>
                <option value="architecture">System Architecture Deep Dive</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Interview Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="English">English</option>
                <option value="English (Concise US)">English (Concise US)</option>
                <option value="English (UK)">English (UK)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Resume / Background Context
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json,.csv"
                onChange={handleResumeUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Upload Resume (.txt/.md)'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={resumeSummary}
              onChange={e => setResumeSummary(e.target.value)}
              placeholder="Paste your key experience highlights or upload a plain-text resume..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">
              Target Job Description (Optional)
            </label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job requirements, tech stack, and responsibilities..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Context is automatically grounded into your Live Copilot and Floating HUD.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => persistAndLaunch(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Launch Floating HUD</span>
          </button>
          <button
            type="button"
            onClick={() => persistAndLaunch(false)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Start Live Copilot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
