import React, { useState } from 'react';
import { 
  UserCheck, 
  Play, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  Award, 
  RotateCcw,
  Send,
  Mic,
  Clock
} from 'lucide-react';
import { mockInterviewService } from '../services/mockInterviewService';
import { localStore } from '../database/localStore';
import { MockInterviewSession, MockInterviewQuestion } from '../types';

export const MockInterviewPage: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState<'devops' | 'sre' | 'kubernetes' | 'behavioral'>('devops');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'intermediate' | 'senior' | 'staff'>('senior');
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const tracks: { id: 'devops' | 'sre' | 'kubernetes' | 'behavioral'; label: string; desc: string }[] = [
    { id: 'devops', label: 'DevOps Engineer', desc: 'CI/CD, Terraform, Kubernetes, security gates, and automation' },
    { id: 'sre', label: 'Site Reliability (SRE)', desc: 'SLIs/SLOs, error budgets, Linux internals, incident command, and multi-region' },
    { id: 'kubernetes', label: 'Kubernetes Specialist', desc: 'Control plane internals, CNI/CSI, RBAC, eBPF, and multi-tenancy' },
    { id: 'behavioral', label: 'Senior Behavioral', desc: 'Engineering leadership, conflict resolution, blameless postmortems' },
  ];

  const handleStartMock = () => {
    const session = mockInterviewService.createSession(selectedTrack, selectedDifficulty);
    setActiveSession(session);
    setUserAnswerText('');
  };

  const currentQIndex = activeSession ? activeSession.currentQuestionIndex : 0;
  const currentQuestion = activeSession ? activeSession.questions[currentQIndex] : null;

  const handleSubmitAnswer = async () => {
    if (!activeSession || !currentQuestion || !userAnswerText.trim() || isEvaluating) return;
    setIsEvaluating(true);

    const evaluation = mockInterviewService.evaluateAnswer(currentQuestion, userAnswerText);

    const updatedQuestions = [...activeSession.questions];
    updatedQuestions[currentQIndex] = {
      ...currentQuestion,
      userAnswer: userAnswerText,
      evaluation,
    };

    const isLast = currentQIndex === activeSession.questions.length - 1;
    let overallScore: number | undefined;

    if (isLast) {
      const total = updatedQuestions.reduce((acc, q) => acc + (q.evaluation?.technicalScore || 70), 0);
      overallScore = Math.round(total / updatedQuestions.length);
    }

    const updatedSession: MockInterviewSession = {
      ...activeSession,
      questions: updatedQuestions,
      status: isLast ? 'completed' : 'in_progress',
      currentQuestionIndex: isLast ? currentQIndex : currentQIndex + 1,
      overallScore,
    };

    setActiveSession(updatedSession);
    localStore.saveMockInterview(updatedSession);
    setUserAnswerText('');
    setIsEvaluating(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Mock Interview Studio</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Interactive simulation with question-by-question technical scoring across 5 hiring criteria.
        </p>
      </div>

      {!activeSession ? (
        /* Configuration Stage */
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6">
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
              1. Select Interview Track
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tracks.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrack(t.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedTrack === t.id
                      ? 'bg-neutral-850 border-indigo-500 shadow-sm'
                      : 'bg-neutral-950/60 hover:bg-neutral-850/50 border-neutral-800'
                  }`}
                >
                  <div className="text-sm font-bold text-white mb-1">{t.label}</div>
                  <div className="text-xs text-neutral-400">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
              2. Select Target Seniority
            </label>
            <div className="flex gap-3">
              {(['intermediate', 'senior', 'staff'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {diff} Level
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800">
            <button
              onClick={handleStartMock}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Begin Technical Mock Interview</span>
            </button>
          </div>
        </div>
      ) : activeSession.status === 'completed' ? (
        /* Final Interview Evaluation Report */
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Session Complete
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">{activeSession.title}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 block">Overall Assessment</span>
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {activeSession.overallScore}/100
              </span>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Question-by-Question Evaluation Breakdown
            </h3>
            {activeSession.questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Question {idx + 1}: {q.question}
                  </span>
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {q.evaluation?.technicalScore}/100
                  </span>
                </div>

                {q.evaluation && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-850 text-xs">
                    <div className="p-2 bg-neutral-900 rounded-lg">
                      <div className="text-[10px] text-neutral-400">Technical Depth</div>
                      <div className="font-mono font-bold text-indigo-300">
                        {q.evaluation.technicalScore}%
                      </div>
                    </div>
                    <div className="p-2 bg-neutral-900 rounded-lg">
                      <div className="text-[10px] text-neutral-400">Problem Solving</div>
                      <div className="font-mono font-bold text-cyan-300">
                        {q.evaluation.problemSolvingScore}%
                      </div>
                    </div>
                    <div className="p-2 bg-neutral-900 rounded-lg">
                      <div className="text-[10px] text-neutral-400">Communication</div>
                      <div className="font-mono font-bold text-emerald-300">
                        {q.evaluation.communicationScore}%
                      </div>
                    </div>
                    <div className="p-2 bg-neutral-900 rounded-lg">
                      <div className="text-[10px] text-neutral-400">Confidence</div>
                      <div className="font-mono font-bold text-amber-300">
                        {q.evaluation.confidenceScore}%
                      </div>
                    </div>
                  </div>
                )}

                {q.evaluation?.strengths && (
                  <div className="text-xs text-neutral-300 pt-1">
                    <strong className="text-emerald-400">Key Strengths: </strong>
                    {q.evaluation.strengths.join(' · ')}
                  </div>
                )}

                {q.evaluation?.improvements && (
                  <div className="text-xs text-neutral-400">
                    <strong className="text-amber-400">Recommendation: </strong>
                    {q.evaluation.improvements.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Another Mock Session</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Interview In-Progress Stage */
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-indigo-400">
                Question {currentQIndex + 1} of {activeSession.questions.length}
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-xs text-neutral-400 font-medium">
                {currentQuestion?.category}
              </span>
            </div>
            <button
              onClick={() => setActiveSession(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Exit Interview
            </button>
          </div>

          {/* Current Question Banner */}
          <div className="p-5 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <span className="text-[11px] font-mono uppercase text-indigo-400 block">
              AI Interviewer Asks:
            </span>
            <h3 className="text-base font-bold text-white leading-relaxed">
              {currentQuestion?.question}
            </h3>
          </div>

          {/* User Answer Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Your Technical Explanation</span>
              <span className="font-mono text-[11px]">Voice or Type below</span>
            </div>
            <textarea
              rows={6}
              value={userAnswerText}
              onChange={e => setUserAnswerText(e.target.value)}
              placeholder="Structure your answer with: 1. Core architecture & immediate triage, 2. Root cause diagnosis, 3. Prevention & SLO error budgets..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() =>
                setUserAnswerText(
                  `In my previous production cluster, I would first check 'kubectl describe pod' for termination exit code 137, inspect container logs with '--previous', and correlate Prometheus 'container_memory_working_set_bytes' against limits. For JVM, I tune '-XX:MaxRAMPercentage=75.0' to respect cgroup bounds.`
                )
              }
              className="text-xs text-indigo-400 hover:underline"
            >
              Insert Sample Candidate Response
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={isEvaluating || !userAnswerText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              {isEvaluating ? (
                <>Evaluating Answer...</>
              ) : (
                <>
                  <span>Submit & Evaluate Answer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
