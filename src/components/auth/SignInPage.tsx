/**
 * Full-Viewport Sign-In Page
 * Firebase Google Sign-In entry gate with interactive Live Interview Copilot preview.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Mic,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../services/firebase';
import { firestoreService } from '../../services/firestoreService';
import { localStore } from '../../database/localStore';
import { UserProfile } from '../../types';
import { GoogleLogoIcon } from './AuthModal';

interface SignInPageProps {
  onSignedIn: (profile: UserProfile) => void;
}

interface PreviewScenario {
  id: string;
  label: string;
  mode: string;
  question: string;
  answer: string[];
  grounding: string;
  latency: string;
}

const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: 'k8s',
    label: 'Kubernetes Triage',
    mode: 'Troubleshooting',
    question: 'Your production payment pods suddenly enter CrashLoopBackOff after a Helm rollout. What are your first three steps?',
    answer: [
      'Inspect container exit code and termination reason immediately with kubectl describe pod and kubectl logs --previous.',
      'Differentiate OOMKilled (Exit 137) vs misconfigured ConfigMap/Secret env vars (Exit 1) or failing readiness/liveness probes.',
      'Mitigate blast radius first with helm rollback <release> <prev-rev>, then validate probe initialDelaySeconds and resource limits in staging.',
    ],
    grounding: 'Grounded in Resume · EKS Production Incident Runbook',
    latency: '410ms',
  },
  {
    id: 'star',
    label: 'Behavioral (STAR)',
    mode: 'STAR Format',
    question: 'Tell me about a high-severity production outage you resolved and how you prevented recurrence.',
    answer: [
      'Situation: Core ingress latency spiked to 8.4s during peak checkout traffic on our multi-AZ EKS cluster.',
      'Task & Action: Correlated CoreDNS conntrack exhaustion in Prometheus, scaled CoreDNS with NodeLocal DNSCache, and tuned HPA stabilization windows.',
      'Result: Restored p99 latency to 42ms within 11 minutes and automated conntrack alerting across all production clusters.',
    ],
    grounding: 'Grounded in Resume · Staff SRE Experience (2023–Present)',
    latency: '380ms',
  },
  {
    id: 'arch',
    label: 'System Design',
    mode: 'Architecture',
    question: 'How would you design a zero-downtime Kubernetes cluster upgrade across stateful and stateless workloads?',
    answer: [
      'Enforce PodDisruptionBudgets (minAvailable) and topologySpreadConstraints across at least 3 availability zones before cordoning.',
      'Run blue/green Karpenter NodePools with staggered drain budgets so stateful workloads migrate cleanly onto patched AMIs.',
      'Gate traffic cutover on synthetic canary checks and Argo CD health hooks before decommissioning old node groups.',
    ],
    grounding: 'Grounded in Knowledge Base · Karpenter & Argo CD Blueprint',
    latency: '440ms',
  },
];

export const SignInPage: React.FC<SignInPageProps> = ({ onSignedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PREVIEW_SCENARIOS[0].id);

  const activeScenario =
    PREVIEW_SCENARIOS.find(s => s.id === selectedScenarioId) || PREVIEW_SCENARIOS[0];

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await firestoreService.syncAuthenticatedUser(result.user);
      localStore.setCurrentUser(profile);

      await firestoreService.logActivity({
        userId: profile.id,
        userEmail: profile.email,
        userName: profile.fullName,
        action: 'login',
        description: `Signed in with Google (${profile.role === 'admin' ? 'Administrator' : 'Candidate'})`,
      });

      onSignedIn(profile);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to complete Google Sign-In. Please try again.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-neutral-950 text-neutral-100 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Column: Centered Authentication Surface */}
      <div className="lg:col-span-5 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-14 border-b lg:border-b-0 lg:border-r border-neutral-800/80 bg-neutral-950">
        {/* Top Wordmark */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-tight">
              M
            </div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Maverick AI
            </span>
          </div>
          <span className="text-xs text-neutral-400 whitespace-nowrap">
            Interview Workspace
          </span>
        </div>

        {/* Center Sign-In Form */}
        <div className="w-full max-w-md mx-auto py-12 space-y-8">
          <div className="space-y-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
              Welcome back
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Sign in with Google to launch your live interview copilot, practice camera-proctored mock rounds, and sync resume-grounded answers.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="break-words leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full min-h-[48px] px-5 py-3 bg-white hover:bg-neutral-100 disabled:opacity-60 text-neutral-950 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
              ) : (
                <GoogleLogoIcon className="w-4 h-4 shrink-0" />
              )}
              <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4 text-neutral-500 ml-0.5" />}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Authenticated via Firebase Google SSO · Redirects to Dashboard</span>
            </div>
          </div>

          {/* Hairline-separated Feature Overview */}
          <div className="pt-6 border-t border-neutral-800/80 divide-y divide-neutral-800/70">
            <div className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-neutral-200">
                  01. Real-Time Interview Copilot
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                  Detects interviewer questions over Zoom, Meet, or Teams and drafts bulleted answers in under a second.
                </p>
              </div>
            </div>
            <div className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-neutral-200">
                  02. Camera & Posture Mock Rounds
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                  Non-repeating DevOps & Cloud questions with live skeleton framing, WPM pacing, and 5-axis rubric scoring.
                </p>
              </div>
            </div>
            <div className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-neutral-200">
                  03. Resume & Job Description Grounding
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                  Tailors every live suggestion and elevator pitch to your verified projects and target role.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <span>Compatible with Zoom · Google Meet · Teams · CoderPad</span>
          <span className="font-mono">Maverick AI</span>
        </div>
      </div>

      {/* Right Column: Interactive Live Copilot Preview */}
      <div className="lg:col-span-7 bg-neutral-900/40 flex flex-col justify-center p-6 sm:p-12 lg:p-16">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-indigo-400">
              Interactive Preview
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
              See how Maverick AI assists during live technical rounds
            </h2>
            <p className="text-sm text-neutral-400">
              Select a sample interviewer prompt below to preview how answers are grounded in your resume and formatted for fast delivery.
            </p>
          </div>

          {/* Interactive Prompt Switcher */}
          <div className="flex flex-wrap items-center gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl w-fit">
            {PREVIEW_SCENARIOS.map(scenario => {
              const isActive = scenario.id === activeScenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>

          {/* Single-Elevation Preview Frame */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
            {/* Simulated Copilot Toolbar */}
            <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <span className="font-semibold text-white">Live Copilot HUD</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span>{activeScenario.mode} Mode</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Audio</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mic</span>
                </span>
                <span className="text-emerald-400">{activeScenario.latency}</span>
              </div>
            </div>

            {/* Detected Interviewer Question */}
            <div className="px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/30 space-y-1.5">
              <div className="text-xs font-medium text-cyan-400">
                Interviewer Question Detected
              </div>
              <p className="text-sm font-medium text-white leading-relaxed">
                {activeScenario.question}
              </p>
            </div>

            {/* Grounded Suggested Response */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-300">
                  Suggested Talking Points
                </span>
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Ready to speak
                </span>
              </div>

              <ul className="space-y-2.5 text-sm text-neutral-200 leading-relaxed">
                {activeScenario.answer.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="font-mono tabular-nums text-xs text-indigo-400 mt-1 shrink-0">
                      0{index + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <span>{activeScenario.grounding}</span>
                <span className="font-mono tabular-nums">Resume Match · Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
