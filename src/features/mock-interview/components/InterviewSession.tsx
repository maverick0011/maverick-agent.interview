/**
 * Interactive Mock Interview Session Component
 * Real-time interview simulation with spoken question narration,
 * thinking timer, voice-to-text live transcription, speaking-pace meter,
 * and live body posture skeleton overlay.
 * (Note: Intrusive "Proctored" warning banners are completely removed).
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Clock, 
  ArrowRight, 
  SkipForward, 
  XSquare, 
  Activity, 
  AlertCircle, 
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Gauge
} from 'lucide-react';
import { 
  InterviewQuestion, 
  InterviewSessionConfig, 
  AnswerRecord, 
  InterviewAttempt,
  CategoryScores 
} from '../types';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { postureTracker, PostureFrameResult } from '../services/postureTracker';
import { evaluatorClient } from '../services/evaluatorClient';

interface InterviewSessionProps {
  config: InterviewSessionConfig;
  questions: InterviewQuestion[];
  userId: string;
  candidateName: string;
  mediaStream: MediaStream | null;
  onSessionComplete: (attempt: InterviewAttempt) => void;
  onExit: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({
  config,
  questions,
  userId,
  candidateName,
  mediaStream,
  onSessionComplete,
  onExit,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'thinking' | 'answering' | 'evaluating'>('thinking');
  const [thinkingSecondsLeft, setThinkingSecondsLeft] = useState(config.thinkingTimeSec || 10);
  const [answerSecondsLeft, setAnswerSecondsLeft] = useState(config.timePerAnswerSec || 120);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentPostureFrame, setCurrentPostureFrame] = useState<PostureFrameResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    transcript,
    setTranscript,
    isListening,
    isSupported,
    wpm,
    fillerCount,
    durationSec,
    startListening,
    stopListening,
    reset: resetSpeech,
    getMetrics: getSpeechMetrics,
  } = useSpeechToText();

  const currentQuestion = questions[currentIdx] || questions[0];

  // 1. Setup Camera Stream and Posture Tracking Loop
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }

    let isMounted = true;
    let startSec = Date.now() / 1000;
    postureTracker.reset();

    const loop = () => {
      if (!isMounted) return;
      if (videoRef.current && canvasRef.current) {
        const elapsed = Date.now() / 1000 - startSec;
        const res = postureTracker.processFrame(videoRef.current, canvasRef.current, elapsed);
        setCurrentPostureFrame(res);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mediaStream]);

  // 2. Read Question Aloud on Question Change
  useEffect(() => {
    if (!currentQuestion) return;

    // Reset states for new question
    resetSpeech();
    setPhase('thinking');
    setThinkingSecondsLeft(config.thinkingTimeSec || 10);
    setAnswerSecondsLeft(config.timePerAnswerSec || 120);

    if (config.readAloud && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsReadingAloud(true);
      utterance.onend = () => setIsReadingAloud(false);
      utterance.onerror = () => setIsReadingAloud(false);
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [currentIdx, currentQuestion, config.readAloud, config.thinkingTimeSec, config.timePerAnswerSec]);

  // 3. Thinking Timer Countdown
  useEffect(() => {
    if (phase !== 'thinking') return;

    const timer = setInterval(() => {
      setThinkingSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Transition to answering phase and start voice listening
          setPhase('answering');
          startListening();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, startListening]);

  // 4. Answering Timer Countdown
  useEffect(() => {
    if (phase !== 'answering') return;

    const timer = setInterval(() => {
      setAnswerSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit answer when time expires
          handleNextQuestion(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  const handleStartSpeakingNow = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    setPhase('answering');
    startListening();
  };

  const handleNextQuestion = async (isSkipped: boolean = false) => {
    stopListening();
    setPhase('evaluating');

    const speechMetrics = getSpeechMetrics();
    const postureMetrics = postureTracker.getSummaryMetrics();
    const finalTranscript = isSkipped ? '[Candidate skipped this question]' : transcript.trim();

    // Call Evaluator Client Adapter
    let evaluation = undefined;
    if (!isSkipped && finalTranscript.length > 5) {
      evaluation = await evaluatorClient.evaluateAnswer({
        userId,
        attemptId: `attempt-${Date.now()}`,
        questionId: currentQuestion.id,
        topic: currentQuestion.topic,
        question: currentQuestion.question,
        expectedKeyPoints: currentQuestion.expectedKeyPoints,
        transcript: finalTranscript,
        speechMetrics: {
          wpm: speechMetrics.wpm,
          fillerCount: speechMetrics.fillerCount,
          pauses: speechMetrics.pauseCount,
          durationSec: speechMetrics.durationSec,
        },
        postureMetrics: {
          goodPosturePct: postureMetrics.goodPosturePct,
          events: postureMetrics.events,
          avgShoulderTilt: postureMetrics.avgShoulderTiltDeg,
          avgHeadOffset: postureMetrics.avgHeadOffsetPx,
        },
      });
    }

    const answerRecord: AnswerRecord = {
      questionId: currentQuestion.id,
      topic: currentQuestion.topic,
      questionText: currentQuestion.question,
      expectedKeyPoints: currentQuestion.expectedKeyPoints,
      transcript: finalTranscript,
      speechMetrics,
      postureMetrics,
      evaluation,
      skipped: isSkipped,
    };

    const updatedAnswers = [...answers, answerRecord];
    setAnswers(updatedAnswers);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Completed all questions! Aggregate final metrics and report
      finalizeAttempt(updatedAnswers);
    }
  };

  const finalizeAttempt = (allAnswers: AnswerRecord[]) => {
    let totalScore = 0;
    const catTotals: CategoryScores = {
      answerQuality: 0,
      communication: 0,
      wordFormation: 0,
      speakingStyle: 0,
      posture: 0,
    };

    allAnswers.forEach(a => {
      if (a.evaluation) {
        totalScore += a.evaluation.overallScore;
        catTotals.answerQuality += a.evaluation.scores.answerQuality;
        catTotals.communication += a.evaluation.scores.communication;
        catTotals.wordFormation += a.evaluation.scores.wordFormation;
        catTotals.speakingStyle += a.evaluation.scores.speakingStyle;
        catTotals.posture += a.evaluation.scores.posture;
      }
    });

    const evaluatedCount = Math.max(1, allAnswers.filter(a => !a.skipped).length);
    const overallScore = Math.round(totalScore / allAnswers.length);

    const categoryScores: CategoryScores = {
      answerQuality: Math.round(catTotals.answerQuality / evaluatedCount) || 50,
      communication: Math.round(catTotals.communication / evaluatedCount) || 50,
      wordFormation: Math.round(catTotals.wordFormation / evaluatedCount) || 50,
      speakingStyle: Math.round(catTotals.speakingStyle / evaluatedCount) || 50,
      posture: Math.round(catTotals.posture / evaluatedCount) || 75,
    };

    const attempt: InterviewAttempt = {
      id: `attempt-${Date.now()}`,
      userId,
      candidateName,
      track: config.track,
      seniority: config.seniority,
      selectedTopics: config.selectedTopics,
      startedAt: new Date(Date.now() - (config.timePerAnswerSec * questions.length * 1000)).toISOString(),
      endedAt: new Date().toISOString(),
      questions,
      answers: allAnswers,
      overallScore,
      categoryScores,
      passed: overallScore >= 80, // >= 80% marks attempt as PASSED & COMPLETED
      status: 'completed',
    };

    onSessionComplete(attempt);
  };

  return (
    <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Session Topbar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
            Q{currentIdx + 1} of {questions.length}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {currentQuestion.topic}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-[11px] text-neutral-400 font-mono capitalize">
            {currentQuestion.type}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Answer Countdown Timer */}
          <div className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border ${
            answerSecondsLeft < 20 
              ? 'bg-rose-950/40 border-rose-600/40 text-rose-300 animate-pulse'
              : 'bg-neutral-950 border-neutral-800 text-neutral-300'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.floor(answerSecondsLeft / 60)}:{(answerSecondsLeft % 60).toString().padStart(2, '0')}</span>
          </div>

          <button
            onClick={onExit}
            className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1"
          >
            <XSquare className="w-3.5 h-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Question & Answer Input, Right Video with Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Question + Speech Recognition Answer Box */}
        <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          {/* Question Narration Banner */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 relative">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-mono text-[11px] uppercase tracking-wider text-indigo-400">
                Technical Interview Question:
              </span>
              <button
                onClick={() => {
                  if (isReadingAloud) {
                    window.speechSynthesis.cancel();
                    setIsReadingAloud(false);
                  } else {
                    const u = new SpeechSynthesisUtterance(currentQuestion.question);
                    window.speechSynthesis.speak(u);
                    setIsReadingAloud(true);
                  }
                }}
                className="p-1 hover:text-white transition-colors"
                title={isReadingAloud ? 'Mute' : 'Read Question Aloud'}
              >
                {isReadingAloud ? (
                  <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            </div>

            <h3 className="text-sm font-semibold text-white leading-relaxed font-sans">
              {currentQuestion.question}
            </h3>

            {/* Thinking Timer Overlay (If active) */}
            {phase === 'thinking' && (
              <div className="pt-2 flex items-center justify-between border-t border-neutral-900 mt-2">
                <div className="flex items-center gap-2 text-xs text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Preparation Time: {thinkingSecondsLeft}s</span>
                </div>
                <button
                  onClick={handleStartSpeakingNow}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Start Speaking Now
                </button>
              </div>
            )}
          </div>

          {/* Answer Box with Live Speech Transcription */}
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-300">Your Technical Response</span>
                {isListening && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Listening (Mic Active)
                  </span>
                )}
              </div>

              {/* Real-time speaking pace & metrics */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1" title="Speaking Pace (Target: 120-160 WPM)">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>{wpm} WPM</span>
                </span>
                <span>·</span>
                <span title="Detected Filler Words">
                  Fillers: <strong className={fillerCount > 3 ? 'text-amber-400' : 'text-neutral-300'}>{fillerCount}</strong>
                </span>
              </div>
            </div>

            <textarea
              rows={7}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Speak aloud into your microphone or type your technical response here. The system captures your spoken explanation live with real-time grammar, fluency, and architectural completeness evaluation..."
              className="w-full flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => handleNextQuestion(true)}
              disabled={phase === 'evaluating'}
              className="flex items-center gap-1.5 px-3.5 py-2 text-neutral-400 hover:text-white rounded-xl text-xs font-medium border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip Question</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  else startListening();
                }}
                className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
                  isListening
                    ? 'bg-rose-950/60 border-rose-600/50 text-rose-300'
                    : 'bg-neutral-800 hover:bg-neutral-750 border-neutral-700 text-neutral-300'
                }`}
                title={isListening ? 'Pause Microphone' : 'Resume Microphone'}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                onClick={() => handleNextQuestion(false)}
                disabled={phase === 'evaluating' || (!transcript.trim() && phase === 'thinking')}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.01]"
              >
                {phase === 'evaluating' ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Evaluating Answer...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Webcam + Skeleton Overlay + Posture Status */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl border border-neutral-800 overflow-hidden flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              width={480}
              height={270}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Posture Score Floating Pill */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded border border-white/10 text-[10px] font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                currentPostureFrame?.status === 'good' ? 'bg-emerald-400' : currentPostureFrame?.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              <span className="text-white">Posture: {currentPostureFrame?.score ?? 90}%</span>
            </div>
          </div>

          {/* 5 Assessment Dimension Live Indicators */}
          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2.5 text-xs">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Assessment Breakdown</span>
              <span className="text-neutral-500 font-mono">Weight %</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">1. Technical Answer Conveyance</span>
                <span className="font-mono text-indigo-400 font-semibold">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">2. Body Posture & Alignment</span>
                <span className="font-mono text-emerald-400 font-semibold">20%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">3. Communication Skills & WPM</span>
                <span className="font-mono text-cyan-400 font-semibold">20%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">4. Word Formation & Grammar</span>
                <span className="font-mono text-purple-400 font-semibold">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">5. Speaking Style & Cadence</span>
                <span className="font-mono text-amber-400 font-semibold">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
