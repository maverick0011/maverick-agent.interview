import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Sparkles, 
  Volume2, 
  Mic, 
  Send, 
  Copy, 
  Check, 
  Layers, 
  Bookmark, 
  Clock, 
  HelpCircle,
  FileText,
  AlertCircle,
  Pin,
  SlidersHorizontal
} from 'lucide-react';
import { audioEngine } from '../services/audioService';
import { generateGroundedCopilotAnswer } from '../services/copilotAnswerService';
import { ragService } from '../services/ragService';
import { localStore } from '../database/localStore';
import { AudioWaveform } from '../components/common/AudioWaveform';
import { getActiveCopilotSessionConfig } from '../components/copilot/CreateSessionModal';
import { TranscriptSegment, AIResponse, AnswerMode, InterviewSession } from '../types';

interface LiveCopilotPageProps {
  onToggleFloating: () => void;
  onOpenCreateSession?: () => void;
}

export const LiveCopilotPage: React.FC<LiveCopilotPageProps> = ({
  onToggleFloating,
  onOpenCreateSession,
}) => {
  const sessionContext = getActiveCopilotSessionConfig();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [activeAnswerMode, setActiveAnswerMode] = useState<AnswerMode>(sessionContext.answerMode || 'senior');
  const [manualQuestion, setManualQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isSessionActive && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, isPaused]);

  // Transcript subscription
  useEffect(() => {
    const unsub = audioEngine.onTranscript(async seg => {
      setTranscripts(prev => [...prev, seg]);

      // Auto scroll transcript to bottom
      if (transcriptScrollRef.current) {
        transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
      }

      // If Interviewer asks a question, auto trigger grounded answer
      if (seg.channel === 'interviewer' && seg.isQuestion) {
        await generateResponseForQuestion(seg.text);
      }
    });

    return unsub;
  }, [activeAnswerMode]);

  const handleStartSession = async () => {
    try {
      await audioEngine.startCapture({ captureSystemAudio: true });
      audioEngine.startSimulatedDialogue(); // also enables realistic dialogue pacing
      setIsSessionActive(true);
      setIsPaused(false);
      setSessionStartTime(Date.now());
      setElapsedSeconds(0);
    } catch (err) {
      console.error('Failed to start audio capture:', err);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const stopMicCapture = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsMicListening(false);
  };

  const toggleMicCapture = () => {
    if (isMicListening) {
      stopMicCapture();
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        const spokenText = String(lastResult[0]?.transcript || '').trim();
        if (spokenText.length > 4) {
          audioEngine.emitSegment('interviewer', spokenText);
          if (spokenText.includes('?') || spokenText.split(' ').length >= 5) {
            generateResponseForQuestion(spokenText);
          }
        }
      }
    };
    rec.onerror = () => setIsMicListening(false);
    rec.onend = () => setIsMicListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsMicListening(true);
  };

  useEffect(() => {
    return () => stopMicCapture();
  }, []);

  const handleStopSession = () => {
    stopMicCapture();
    audioEngine.stopCapture();
    setIsSessionActive(false);

    // Save session to local database
    if (transcripts.length > 0 || aiResponses.length > 0) {
      const newSession: InterviewSession = {
        id: `session-${Date.now()}`,
        title: sessionContext.company
          ? `${sessionContext.company} · ${sessionContext.targetRole}`
          : `Live Copilot Session · ${new Date().toLocaleDateString()}`,
        role: sessionContext.targetRole || localStore.getResume().targetRole || 'DevOps / SRE Engineer',
        company: sessionContext.company || undefined,
        createdAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds,
        transcripts,
        responses: aiResponses,
        summary: `Dual-channel meeting captured ${transcripts.length} dialogue turns with ${aiResponses.length} grounded AI answers generated.`,
        actionItems: [
          'Review questions flagged during interview',
          'Cross-reference architecture points with verified runbooks',
        ],
      };
      localStore.saveSession(newSession);
    }
  };

  const generateResponseForQuestion = async (questionText: string) => {
    setIsGenerating(true);
    const sources = await ragService.findRelevantSources(questionText);
    const responseId = `resp-${Date.now()}`;

    // Add streaming placeholder
    const placeholder: AIResponse = {
      id: responseId,
      questionText,
      answerText: '',
      mode: activeAnswerMode,
      category: 'devops',
      timestamp: new Date().toLocaleTimeString(),
      latencyMs: 0,
      groundedSources: sources,
      isStreaming: true,
    };
    setAiResponses(prev => [placeholder, ...prev]);

    const { answer, latencyMs } = await generateGroundedCopilotAnswer({
      question: questionText,
      mode: activeAnswerMode,
      groundedSources: sources,
      onToken: partial => {
        setAiResponses(prev =>
          prev.map(r => (r.id === responseId ? { ...r, answerText: partial } : r))
        );
      },
    });

    const finalResponse: AIResponse = {
      id: responseId,
      questionText,
      answerText: answer,
      mode: activeAnswerMode,
      category: 'devops',
      timestamp: new Date().toLocaleTimeString(),
      latencyMs,
      groundedSources: sources,
      isStreaming: false,
    };

    setAiResponses(prev =>
      prev.map(r => (r.id === responseId ? finalResponse : r))
    );
    localStore.saveAIResponse(finalResponse);
    setIsGenerating(false);
  };

  const handleManualAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestion.trim() || isGenerating) return;
    const q = manualQuestion.trim();
    setManualQuestion('');
    // Emit as candidate query or interviewer query
    audioEngine.emitSegment('interviewer', q);
    await generateResponseForQuestion(q);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Session Control Toolbar */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {!isSessionActive ? (
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Live Session</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                    isPaused
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border-neutral-700'
                  }`}
                >
                  <Pause className="w-4 h-4" />
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStopSession}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop & Save</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={toggleMicCapture}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                isMicListening
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
              title="Listen to live spoken questions via browser Speech Recognition"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isMicListening ? 'Listening...' : 'Live Mic'}</span>
            </button>

            {onOpenCreateSession && (
              <button
                type="button"
                onClick={onOpenCreateSession}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors whitespace-nowrap"
                title="Set target company, role, job description, and resume context"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Context</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400 tabular-nums">
            <Clock className="w-4 h-4 text-neutral-500" />
            <span className="text-white font-bold">{formatDuration(elapsedSeconds)}</span>
            <span>·</span>
            <span className={isSessionActive || isMicListening ? 'text-emerald-400' : 'text-neutral-500'}>
              {isMicListening ? 'Live Mic Active' : isSessionActive ? (isPaused ? 'Paused' : 'Recording Audio') : 'Session Ready'}
            </span>
          </div>
        </div>

        {/* Answer Mode Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          {(
            [
              { id: 'senior', label: 'Senior Engineer' },
              { id: 'crisp', label: 'Crisp & Direct' },
              { id: 'star', label: 'STAR Format' },
              { id: 'troubleshooting', label: 'Troubleshooting' },
              { id: 'architecture', label: 'Architecture' },
            ] as { id: AnswerMode; label: string }[]
          ).map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveAnswerMode(mode.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeAnswerMode === mode.id
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Waveform Live Telemetry */}
      <AudioWaveform />

      {/* Dual Panel Layout: Transcripts on Left, AI Answers on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
        {/* Left Column: Live Transcripts (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span>Dual-Channel Transcript Stream</span>
              <span className="font-mono text-neutral-500">({transcripts.length})</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
              <span className="text-cyan-400">■ System</span>
              <span className="text-indigo-400">■ Mic</span>
            </div>
          </div>

          {/* Transcript Scroll Area */}
          <div
            ref={transcriptScrollRef}
            className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[500px]"
          >
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500 text-xs">
                <Volume2 className="w-8 h-8 mb-2 opacity-40 text-neutral-400" />
                <p className="font-medium text-neutral-400">No Audio Detected</p>
                <p className="mt-1">
                  Click &quot;Start Live Session&quot; above to capture microphone and meeting system audio.
                </p>
              </div>
            ) : (
              transcripts.map(seg => (
                <div
                  key={seg.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    seg.channel === 'interviewer'
                      ? 'bg-cyan-950/20 border-cyan-800/40 text-neutral-200'
                      : 'bg-indigo-950/20 border-indigo-800/40 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        seg.channel === 'interviewer' ? 'text-cyan-400' : 'text-indigo-400'
                      }`}
                    >
                      {seg.channel === 'interviewer' ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5" /> INTERVIEWER / SYSTEM
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" /> YOU / MICROPHONE
                        </>
                      )}
                    </span>
                    <span className="font-mono text-neutral-500">{seg.timestamp}</span>
                  </div>

                  <div className="leading-relaxed text-neutral-100">{seg.text}</div>

                  {seg.isQuestion && (
                    <div className="pt-1 flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
                      <HelpCircle className="w-3 h-3" /> Question Identified · Generating Answer
                    </div>
                  )}

                  {seg.detectedTopics && seg.detectedTopics.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {seg.detectedTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-400"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Answers & Grounding (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Grounded Intelligence Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFloating}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-850 border border-neutral-700/80 rounded-md transition-colors"
                title="Pop out Floating HUD window"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pop Out HUD</span>
              </button>
            </div>
          </div>

          {/* Answers Feed */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[500px]">
            {aiResponses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500 text-xs">
                <Sparkles className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                <p className="font-medium text-neutral-400">Awaiting Interviewer Questions</p>
                <p className="mt-1">
                  When the interviewer asks a question, Maverick AI extracts context from your resume and local runbooks to generate production-ready answers.
                </p>
              </div>
            ) : (
              aiResponses.map(resp => (
                <div
                  key={resp.id}
                  className={`p-4 bg-neutral-950/80 border rounded-xl space-y-3 transition-all ${
                    pinnedId === resp.id ? 'border-indigo-500/80 bg-neutral-950' : 'border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-850 pb-2">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-indigo-400 block mb-0.5">
                        Interviewer Question
                      </span>
                      <h4 className="text-sm font-semibold text-white leading-snug">
                        {resp.questionText}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-mono text-neutral-400 mr-1">
                        {resp.latencyMs}ms
                      </span>
                      <button
                        onClick={() => setPinnedId(pinnedId === resp.id ? null : resp.id)}
                        className={`p-1 rounded hover:bg-neutral-800 transition-colors ${
                          pinnedId === resp.id ? 'text-indigo-400' : 'text-neutral-500'
                        }`}
                        title="Pin this answer"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(resp.id, resp.answerText)}
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === resp.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Answer Text */}
                  <div className="text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30 font-sans">
                    {resp.answerText}
                    {resp.isStreaming && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-500 animate-pulse" />
                    )}
                  </div>

                  {/* Grounded Runbooks and Citations */}
                  {resp.groundedSources.length > 0 && (
                    <div className="pt-2 border-t border-neutral-850 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-400" /> Grounded In:
                      </span>
                      {resp.groundedSources.map((src, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono flex items-center gap-1"
                        >
                          <span className="text-indigo-400 font-bold">[{idx + 1}]</span>
                          <span className="truncate max-w-[220px]">{src.documentTitle}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Bottom Manual Ask AI Bar */}
          <form
            onSubmit={handleManualAsk}
            className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask Maverick AI a question or simulate interviewer query..."
              value={manualQuestion}
              onChange={e => setManualQuestion(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isGenerating || !manualQuestion.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
