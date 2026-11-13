/**
 * Unified Grounded Copilot Answer Service
 * Routes to local Ollama when active, or server-side Gemini (/api/copilot/answer)
 * grounded in active Resume, Job Description, and Knowledge Base snippets.
 */

import { localStore } from '../database/localStore';
import { ollamaService } from './ollamaService';
import { getActiveCopilotSessionConfig } from '../components/copilot/CreateSessionModal';
import { AnswerMode, GroundedSource } from '../types';

export interface CopilotSynthesisResult {
  answer: string;
  latencyMs: number;
  provider: 'gemini' | 'ollama' | 'local-fallback';
}

export async function generateGroundedCopilotAnswer(params: {
  question: string;
  mode: AnswerMode;
  groundedSources: GroundedSource[];
  onToken?: (partial: string) => void;
}): Promise<CopilotSynthesisResult> {
  const sessionCfg = getActiveCopilotSessionConfig();
  const resume = localStore.getResume();

  // Check if local Ollama runtime is explicitly online first
  const conn = await ollamaService.checkConnection();
  if (conn.isOnline) {
    const res = await ollamaService.generateAnswer({
      prompt: params.question,
      question: params.question,
      mode: params.mode,
      category: 'devops',
      groundedSources: params.groundedSources,
      onToken: params.onToken,
    });
    return {
      answer: res.answer,
      latencyMs: res.latencyMs,
      provider: 'ollama',
    };
  }

  // Otherwise use server-side Gemini grounded in Resume + JD + Knowledge Snippets
  try {
    const startedAt = Date.now();
    const response = await fetch('/api/copilot/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: params.question,
        mode: params.mode,
        company: sessionCfg.company,
        targetRole: sessionCfg.targetRole || resume.targetRole,
        jobDescription: sessionCfg.jobDescription,
        resumeSummary: `${resume.summary}\nHighlights: ${resume.experience.flatMap(e => e.highlights).slice(0, 5).join(' | ')}`,
        groundedSnippets: params.groundedSources.map(s => `${s.documentTitle}: ${s.snippet}`),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.fallback && typeof data.answer === 'string' && data.answer.trim()) {
        const answer = data.answer.trim();
        params.onToken?.(answer);
        return {
          answer,
          latencyMs: Number(data.latencyMs || Date.now() - startedAt),
          provider: 'gemini',
        };
      }
    }
  } catch {
    // Fallback to local grounded synthesizer if server is unreachable
  }

  const fallbackRes = await ollamaService.generateAnswer({
    prompt: params.question,
    question: params.question,
    mode: params.mode,
    category: 'devops',
    groundedSources: params.groundedSources,
    onToken: params.onToken,
  });

  return {
    answer: fallbackRes.answer,
    latencyMs: fallbackRes.latencyMs,
    provider: 'local-fallback',
  };
}
