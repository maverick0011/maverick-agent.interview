import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Minus, 
  Sparkles, 
  Volume2, 
  Mic, 
  Send, 
  EyeOff, 
  Eye, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import { audioEngine, AudioVolumeTelemetry } from '../../services/audioService';
import { generateGroundedCopilotAnswer } from '../../services/copilotAnswerService';
import { ragService } from '../../services/ragService';
import { localStore } from '../../database/localStore';
import { TranscriptSegment, AIResponse, AnswerMode } from '../../types';

interface FloatingAssistantProps {
  onClose: () => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ onClose }) => {
  const [opacity, setOpacity] = useState(0.95);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandTranscript, setExpandTranscript] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [latestResponse, setLatestResponse] = useState<AIResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('senior');
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 60 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Listen to live transcripts
  useEffect(() => {
    const unsub = audioEngine.onTranscript(async seg => {
      setTranscripts(prev => [seg, ...prev.slice(0, 19)]);

      if (seg.isQuestion && seg.channel === 'interviewer') {
        // Trigger automated grounded answer synthesis
        await triggerAnswer(seg.text);
      }
    });
    return unsub;
  }, [answerMode]);

  const triggerAnswer = async (questionText: string) => {
    setIsGenerating(true);
    const sources = await ragService.findRelevantSources(questionText);

    const { answer, latencyMs } = await generateGroundedCopilotAnswer({
      question: questionText,
      mode: answerMode,
      groundedSources: sources,
      onToken: partial => {
        setLatestResponse({
          id: `resp-${Date.now()}`,
          questionText,
          answerText: partial,
          mode: answerMode,
          category: 'sre',
          timestamp: new Date().toLocaleTimeString(),
          latencyMs: 0,
          groundedSources: sources,
          isStreaming: true,
        });
      },
    });

    const finalResponse: AIResponse = {
      id: `resp-${Date.now()}`,
      questionText,
      answerText: answer,
      mode: answerMode,
      category: 'sre',
      timestamp: new Date().toLocaleTimeString(),
      latencyMs,
      groundedSources: sources,
      isStreaming: false,
    };

    setLatestResponse(finalResponse);
    localStore.saveAIResponse(finalResponse);
    setIsGenerating(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim() || isGenerating) return;
    const q = manualQuery.trim();
    setManualQuery('');
    await triggerAnswer(q);
  };

  const handleCopy = () => {
    if (!latestResponse) return;
    navigator.clipboard.writeText(latestResponse.answerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dragging support
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 420, e.clientX - dragStartRef.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 300, e.clientY - dragStartRef.current.y)),
      });
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const isCapturing = audioEngine.getIsCapturing();

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity,
      }}
      className={`fixed z-50 w-96 max-w-[95vw] bg-neutral-950/95 border border-indigo-500/30 rounded-2xl shadow-2xl backdrop-blur-xl transition-opacity flex flex-col overflow-hidden select-none`}
    >
      {/* Draggable HUD Header */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3.5 py-2.5 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-xs font-bold text-white tracking-tight">MAVERICK HUD</span>
          {isCapturing && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Privacy Screen Sharing Toggle */}
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`p-1 rounded transition-colors ${
              privacyMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-400 hover:text-white'
            }`}
            title={privacyMode ? 'Privacy Mode Active (Protected in Screen Share)' : 'Privacy Mode Off'}
          >
            {privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize HUD */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-neutral-400 hover:text-white rounded"
            title="Minimize HUD"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close HUD */}
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-rose-400 rounded"
            title="Close Floating Assistant"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3.5 flex flex-col gap-3 max-h-[580px] overflow-y-auto">
          {/* Mode Selector & Opacity slider */}
          <div className="flex items-center justify-between text-xs">
            <select
              value={answerMode}
              onChange={e => setAnswerMode(e.target.value as AnswerMode)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              <option value="senior">Senior Engineer Mode</option>
              <option value="crisp">Short & Crisp</option>
              <option value="star">STAR Scenario</option>
              <option value="troubleshooting">Troubleshooting Triage</option>
              <option value="architecture">Architecture Detail</option>
            </select>

            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
              <span>Opacity:</span>
              <input
                type="range"
                min="0.4"
                max="1"
                step="0.05"
                value={opacity}
                onChange={e => setOpacity(parseFloat(e.target.value))}
                className="w-14 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Answer Card (Most Recent) */}
          {latestResponse ? (
            <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800/80 pb-1.5">
                <span className="font-medium text-indigo-300 truncate max-w-[200px]">
                  Q: {latestResponse.questionText}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-neutral-500">{latestResponse.latencyMs}ms</span>
                  <button
                    onClick={handleCopy}
                    className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                    title="Copy Answer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-neutral-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans selection:bg-indigo-500/30">
                {latestResponse.answerText}
              </div>

              {latestResponse.groundedSources.length > 0 && (
                <div className="pt-1.5 border-t border-neutral-800/80 flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <span className="font-semibold text-neutral-300">Grounded:</span>
                  <span className="truncate text-indigo-300">
                    {latestResponse.groundedSources[0].documentTitle}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-neutral-900/60 border border-neutral-800/80 rounded-xl text-center">
              <Sparkles className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
              <p className="text-xs text-neutral-300 font-medium">Ready for Interview Dialogue</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Speak or wait for the interviewer. Maverick AI detects questions automatically.
              </p>
            </div>
          )}

          {/* Expandable Live Transcript Feed */}
          <div className="border border-neutral-800/80 rounded-xl overflow-hidden bg-neutral-900/50">
            <button
              onClick={() => setExpandTranscript(!expandTranscript)}
              className="w-full px-3 py-2 text-[11px] font-medium text-neutral-400 hover:text-neutral-200 flex items-center justify-between bg-neutral-900/80"
            >
              <span>Live Transcript Stream ({transcripts.length})</span>
              {expandTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expandTranscript && (
              <div className="p-2 space-y-1.5 max-h-36 overflow-y-auto text-[11px]">
                {transcripts.length === 0 ? (
                  <div className="text-neutral-500 italic p-1">No speech segments detected yet.</div>
                ) : (
                  transcripts.map(seg => (
                    <div
                      key={seg.id}
                      className={`p-1.5 rounded ${
                        seg.channel === 'interviewer'
                          ? 'bg-cyan-950/30 border border-cyan-800/30 text-cyan-200'
                          : 'bg-indigo-950/30 border border-indigo-800/30 text-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-75 mb-0.5">
                        <span className="font-semibold uppercase">{seg.channel}</span>
                        <span>{seg.timestamp}</span>
                      </div>
                      <div className="leading-tight">{seg.text}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Ask AI Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Ask Maverick AI..."
              value={manualQuery}
              onChange={e => setManualQuery(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isGenerating || !manualQuery.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center justify-center transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
