/**
 * Candidate Results & Performance Analytics View
 * Visualizes the 5-dimension assessment breakdown:
 * 1. Body Posture (20%)
 * 2. Word Formation (15%)
 * 3. Communication Skills (20%)
 * 4. Way of Talking / Speaking Style (10%)
 * 5. Answer Conveyance (35%)
 * Includes 5-axis SVG Radar Chart, Per-Topic Breakdown, and Posture Timeline.
 */

import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
} from 'lucide-react';
import { InterviewAttempt, PostureEvent } from '../types';

interface ResultsViewProps {
  attempt: InterviewAttempt;
  onRetry: () => void;
  onSelectNewTopics: () => void;
}

const CategoryRadarChart: React.FC<{ scores: InterviewAttempt['categoryScores'] }> = ({ scores }) => {
  const axes = [
    { label: 'Technical', value: scores.answerQuality },
    { label: 'Posture', value: scores.posture },
    { label: 'Comm.', value: scores.communication },
    { label: 'Words', value: scores.wordFormation },
    { label: 'Delivery', value: scores.speakingStyle },
  ];

  const cx = 130;
  const cy = 120;
  const radius = 80;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, pct: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (pct / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((ax, i) => {
      const pt = getPoint(i, ax.value);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 260 240" className="w-full max-w-[260px] mx-auto">
      {levels.map(lvl => {
        const pts = axes
          .map((_, i) => {
            const p = getPoint(i, lvl);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={lvl}
            points={pts}
            fill="none"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="1"
          />
        );
      })}
      {axes.map((ax, i) => {
        const edge = getPoint(i, 100);
        const labelPt = getPoint(i, 122);
        return (
          <g key={ax.label}>
            <line
              x1={cx}
              y1={cy}
              x2={edge.x}
              y2={edge.y}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="1"
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#a3a3a3"
              fontSize="10"
              fontFamily="monospace"
            >
              {ax.label} ({ax.value}%)
            </text>
          </g>
        );
      })}
      <polygon
        points={polygonPoints}
        fill="rgba(99, 102, 241, 0.28)"
        stroke="#818cf8"
        strokeWidth="2"
      />
      {axes.map((ax, i) => {
        const pt = getPoint(i, ax.value);
        return <circle key={ax.label} cx={pt.x} cy={pt.y} r="3.5" fill="#a5b4fc" />;
      })}
    </svg>
  );
};

export const ResultsView: React.FC<ResultsViewProps> = ({
  attempt,
  onRetry,
  onSelectNewTopics,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const isPassed = attempt.passed;

  const topicBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const ans of attempt.answers) {
      const score = ans.evaluation?.overallScore ?? (ans.skipped ? 0 : 50);
      const entry = map.get(ans.topic) || { total: 0, count: 0 };
      entry.total += score;
      entry.count += 1;
      map.set(ans.topic, entry);
    }
    return Array.from(map.entries()).map(([topic, data]) => ({
      topic,
      avgScore: Math.round(data.total / Math.max(1, data.count)),
      questionCount: data.count,
    }));
  }, [attempt.answers]);

  const postureTimeline = useMemo(() => {
    const events: Array<PostureEvent & { questionIndex: number }> = [];
    attempt.answers.forEach((ans, idx) => {
      (ans.postureMetrics?.events || []).forEach(ev => {
        events.push({ ...ev, questionIndex: idx + 1 });
      });
    });
    return events;
  }, [attempt.answers]);

  return (
    <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-7 animate-fade-in max-w-6xl mx-auto">
      {/* Header Banner: Score + Pass/Retry Badge */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 ${
        isPassed
          ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-indigo-950/30 border-emerald-500/40'
          : 'bg-gradient-to-r from-amber-950/40 via-neutral-900 to-rose-950/30 border-amber-500/40'
      }`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              isPassed
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isPassed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>COMPLETED · PASSED ASSESSMENT (80%+)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>NOT COMPLETED · RETRY REQUIRED (THRESHOLD: 80%)</span>
                </>
              )}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            {attempt.candidateName}&apos;s Interview Evaluation
          </h2>
          <p className="text-xs text-neutral-400">
            {attempt.track.toUpperCase()} Track · {attempt.seniority.toUpperCase()} Seniority · Topics: {attempt.selectedTopics.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] font-mono uppercase text-neutral-400 block">
              Overall Composite Score
            </span>
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${
              isPassed ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {attempt.overallScore}%
            </span>
          </div>
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${
            isPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <Award className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 5-Dimension Breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span>Evaluation Rubric (5 Core Dimensions)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
              <span>Technical Answer</span>
              <span className="text-indigo-400 font-bold">35% Weight</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{attempt.categoryScores.answerQuality}%</div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${attempt.categoryScores.answerQuality}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500">Technical depth & key architecture points</p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
              <span>Body Posture</span>
              <span className="text-emerald-400 font-bold">20% Weight</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{attempt.categoryScores.posture}%</div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${attempt.categoryScores.posture}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500">Spine alignment, level shoulders & gaze</p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
              <span>Communication</span>
              <span className="text-cyan-400 font-bold">20% Weight</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{attempt.categoryScores.communication}%</div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${attempt.categoryScores.communication}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500">Pace (WPM), clarity & minimal filler words</p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
              <span>Word Formation</span>
              <span className="text-purple-400 font-bold">15% Weight</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{attempt.categoryScores.wordFormation}%</div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${attempt.categoryScores.wordFormation}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500">Grammar, technical vocabulary & structure</p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
              <span>Speaking Style</span>
              <span className="text-amber-400 font-bold">10% Weight</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{attempt.categoryScores.speakingStyle}%</div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${attempt.categoryScores.speakingStyle}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500">Confidence, pauses & natural delivery tone</p>
          </div>
        </div>
      </div>

      {/* Radar Chart + Per-Topic Breakdown + Posture Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
          <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            Category Radar Profile
          </div>
          <CategoryRadarChart scores={attempt.categoryScores} />
        </div>

        <div className="lg:col-span-4 p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
          <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Per-Topic Breakdown</span>
          </div>
          <div className="space-y-2.5">
            {topicBreakdown.map(tb => (
              <div key={tb.topic} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{tb.topic} ({tb.questionCount}Q)</span>
                  <span className={`font-mono font-bold ${
                    tb.avgScore >= 80 ? 'text-emerald-400' : tb.avgScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {tb.avgScore}%
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tb.avgScore >= 80 ? 'bg-emerald-500' : tb.avgScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${tb.avgScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
          <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Posture Event Timeline</span>
          </div>
          {postureTimeline.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300">
              Consistent upright alignment maintained throughout the session with zero posture alerts.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {postureTimeline.map((ev, idx) => (
                <div
                  key={`${ev.questionIndex}-${ev.timestampSec}-${idx}`}
                  className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-[11px]"
                >
                  <div>
                    <span className="font-semibold text-white">Q{ev.questionIndex} · {ev.message}</span>
                    <span className="block text-[10px] font-mono text-neutral-500 uppercase">{ev.type.replace('_', ' ')}</span>
                  </div>
                  <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                    ev.severity === 'alert'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {ev.timestampSec}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question by Question Drill-down */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
          <span>Question-by-Question Diagnostic Feedback ({attempt.answers.length} Questions)</span>
          <span className="text-[11px] text-neutral-500 font-normal">Click any question to inspect detailed metrics</span>
        </h3>

        <div className="space-y-3">
          {attempt.answers.map((ans, idx) => {
            const isExpanded = expandedQuestionId === ans.questionId || (idx === 0 && expandedQuestionId === null);
            const score = ans.evaluation?.overallScore ?? (ans.skipped ? 0 : 50);

            return (
              <div
                key={ans.questionId}
                className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedQuestionId(isExpanded ? '' : ans.questionId)}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-neutral-900/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                        Q{idx + 1} · {ans.topic}
                      </span>
                      {ans.skipped && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40">
                          SKIPPED (0%)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {ans.questionText}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block font-mono">Score</span>
                      <span className={`text-base font-bold font-mono ${
                        score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {score}%
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-neutral-850 space-y-4 bg-neutral-900/30 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-indigo-400 block font-semibold">
                        Candidate Spoken Transcript:
                      </span>
                      <p className="text-neutral-300 bg-neutral-950 p-3 rounded-lg border border-neutral-850 italic">
                        &quot;{ans.transcript}&quot;
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                        <span className="text-neutral-500 block text-[10px]">Speaking Pace</span>
                        <span className="text-cyan-300 font-bold">{ans.speechMetrics.wpm} WPM</span>
                      </div>
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                        <span className="text-neutral-500 block text-[10px]">Filler Words</span>
                        <span className="text-amber-300 font-bold">{ans.speechMetrics.fillerCount} fillers</span>
                      </div>
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                        <span className="text-neutral-500 block text-[10px]">Good Posture</span>
                        <span className="text-emerald-300 font-bold">{ans.postureMetrics.goodPosturePct}%</span>
                      </div>
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                        <span className="text-neutral-500 block text-[10px]">Shoulder Tilt</span>
                        <span className="text-neutral-300 font-bold">{ans.postureMetrics.avgShoulderTiltDeg}°</span>
                      </div>
                    </div>

                    {ans.evaluation && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg space-y-1">
                          <span className="text-[10px] font-mono uppercase text-emerald-400 block font-bold">
                            Evaluator Strengths:
                          </span>
                          <ul className="list-disc list-inside text-neutral-300 space-y-0.5 text-[11px]">
                            {ans.evaluation.feedback.strengths.map((str, sIdx) => (
                              <li key={sIdx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg space-y-1">
                          <span className="text-[10px] font-mono uppercase text-amber-400 block font-bold">
                            Actionable Improvements:
                          </span>
                          <ul className="list-disc list-inside text-neutral-300 space-y-0.5 text-[11px]">
                            {ans.evaluation.feedback.improvements.map((imp, iIdx) => (
                              <li key={iIdx}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
        <button
          onClick={onSelectNewTopics}
          className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          Change Topics & Tracks
        </button>

        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry with Fresh Questions</span>
        </button>
      </div>
    </div>
  );
};
