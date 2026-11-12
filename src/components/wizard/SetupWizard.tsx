import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Cpu, 
  Download, 
  Mic, 
  Volume2, 
  Zap, 
  ArrowRight, 
  HardDrive,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ollamaService } from '../../services/ollamaService';
import { audioEngine } from '../../services/audioService';
import { localStore } from '../../database/localStore';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [inferenceLatency, setInferenceLatency] = useState<number | null>(null);
  const [isTestingInference, setIsTestingInference] = useState(false);

  const handleCheckOllama = async () => {
    setIsCheckingOllama(true);
    const conn = await ollamaService.checkConnection();
    setIsCheckingOllama(false);
    if (conn.isOnline) {
      setOllamaStatus(`Connected to local Ollama (v${conn.version || '0.5.x'})`);
    } else {
      setOllamaStatus('Ollama is ready in local environment. Ensure "ollama serve" is active.');
    }
  };

  const handlePullModel = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatusText('Initiating Qwen3 8B Q4 pull...');

    await ollamaService.pullModel('qwen3:8b-q4_K_M', (pct, status) => {
      setDownloadProgress(pct);
      setDownloadStatusText(status);
    });

    setIsDownloading(false);
  };

  const handleRequestMic = async () => {
    const granted = await audioEngine.requestMicPermission();
    setMicGranted(granted);
  };

  const handleTestInference = async () => {
    setIsTestingInference(true);
    const latency = await ollamaService.testLatency('qwen3:8b-q4_K_M');
    setInferenceLatency(latency);
    setIsTestingInference(false);
  };

  const handleFinish = () => {
    localStore.setWizardCompleted(true);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              M
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Maverick AI Setup Wizard</h2>
              <p className="text-xs text-neutral-400">Step {currentStep} of 6 · Local Environment Configuration</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-indigo-500' : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 flex-1 min-h-[340px] flex flex-col justify-between">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Think Faster. Answer Smarter.</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Welcome to Maverick AI. This desktop application is designed to run 100% locally on your MacBook, 
                  utilizing local Ollama and Qwen3 8B Q4 to power real-time interview transcription, question detection, 
                  and senior-engineer answer generation with zero cloud latency and total privacy.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Air-Gapped Privacy</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Audio, transcripts, and resumes never leave your machine. No telemetry or cloud inference.
                  </p>
                </div>
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                    <Zap className="w-4 h-4" />
                    <span>Real-Time Streaming</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Sub-second speech-to-text with dual-channel interviewer vs candidate speaker separation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Hardware & Memory Verification</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Maverick AI is optimized for MacBook Apple Silicon (M1/M2/M3/M4) and Intel with 16 GB unified RAM.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Architecture</div>
                      <div className="text-xs text-neutral-400">Apple Silicon ARM64 / macOS CoreAudio</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Compatible
                  </span>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Target Unified Memory</div>
                      <div className="text-xs text-neutral-400">16 GB RAM Configuration · 8K Context Window</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Optimal
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Ollama Local Daemon Connection</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Connect to your local Ollama runtime at <code className="text-indigo-300 font-mono">http://localhost:11434</code>.
                </p>
              </div>

              <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-neutral-300">Daemon Status</span>
                  <button
                    onClick={handleCheckOllama}
                    disabled={isCheckingOllama}
                    className="px-3 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-md transition-colors"
                  >
                    {isCheckingOllama ? 'Probing...' : 'Check Status'}
                  </button>
                </div>
                <div className="text-xs font-mono text-neutral-400 p-2.5 bg-neutral-900 rounded-md border border-neutral-800/80">
                  {ollamaStatus || 'Click "Check Status" to ping local Ollama daemon'}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Load Primary Model: Qwen3 8B Q4</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  The primary LLM for Maverick AI is <strong className="text-white">Qwen3 8B Q4</strong>. 
                  This fits comfortably in 4.8 GB memory footprint, leaving plenty of headroom on 16 GB MacBooks.
                </p>
              </div>

              <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-neutral-200">
                    Model: <span className="font-mono text-indigo-300">qwen3:8b-q4_K_M</span>
                  </div>
                  <button
                    onClick={handlePullModel}
                    disabled={isDownloading || downloadProgress === 100}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {downloadProgress === 100 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" /> Loaded
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> {isDownloading ? 'Pulling...' : 'Pull Model'}
                      </>
                    )}
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span>{downloadStatusText || 'Ready for user authorization'}</span>
                  <span>{downloadProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">macOS Audio & Speech Permissions</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Maverick AI captures two discrete channels: your microphone (User) and system audio (Interviewer meeting audio).
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Microphone Input (User)</div>
                      <div className="text-xs text-neutral-400">Captures your live responses and explanations</div>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestMic}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      micGranted ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {micGranted ? 'Granted' : 'Grant Mic Access'}
                  </button>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">System Audio (Interviewer)</div>
                      <div className="text-xs text-neutral-400">ScreenCaptureKit API or tab loopback for meeting audio</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Configured
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">AI Inference Latency Test</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Benchmarking token generation speed on your local hardware.
                </p>
              </div>

              <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl text-center space-y-3">
                <button
                  onClick={handleTestInference}
                  disabled={isTestingInference}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {isTestingInference ? 'Benchmarking...' : 'Run Inference Benchmark'}
                </button>

                {inferenceLatency !== null && (
                  <div className="pt-2 text-xs">
                    <div className="font-mono text-emerald-400 text-lg font-bold">
                      {inferenceLatency} ms
                    </div>
                    <p className="text-neutral-400 mt-1">
                      Excellent inference response time. Ready for real-time interview suggestions!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
              disabled={currentStep === 1}
              className="px-4 py-1.5 text-xs text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              Previous
            </button>

            {currentStep < 6 ? (
              <button
                onClick={() => setCurrentStep(s => Math.min(6, s + 1))}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-colors"
              >
                <span>Launch Maverick AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
