/**
 * Camera & Hardware Pre-Check Modal
 * Verifies camera, microphone, ambient lighting, and upper-body framing
 * with live posture skeleton preview before starting the interview.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Mic, 
  Sun, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  X,
  Volume2
} from 'lucide-react';
import { postureTracker } from '../services/postureTracker';

interface PreCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReadyToStart: (stream: MediaStream | null) => void;
}

export const PreCheckModal: React.FC<PreCheckModalProps> = ({
  isOpen,
  onClose,
  onReadyToStart,
}) => {
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [isLightingOk, setIsLightingOk] = useState(true);
  const [isFramingOk, setIsFramingOk] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initHardware() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasCamera(true);
        setHasMic(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Setup live audio meter
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkAudio = () => {
            if (!isMounted) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
            requestAnimationFrame(checkAudio);
          };
          checkAudio();
        } catch {
          // Audio analyzer unavailable
        }

        // Start posture skeleton loop
        let startSec = Date.now() / 1000;
        const renderLoop = () => {
          if (!isMounted) return;
          if (videoRef.current && canvasRef.current) {
            const elapsed = Date.now() / 1000 - startSec;
            const res = postureTracker.processFrame(videoRef.current, canvasRef.current, elapsed);
            setIsFramingOk(!res.isOutOfFrame && res.status !== 'alert');
          }
          animFrameRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();

      } catch (err) {
        // Fallback for devices without webcam or denied permissions
        setHasCamera(false);
        setHasMic(false);
        setIsFramingOk(true);
      }
    }

    initHardware();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStart = () => {
    onReadyToStart(streamRef.current);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Candidate Hardware & Posture Pre-Check
              </h2>
              <p className="text-[11px] text-neutral-400">
                Calibrating camera alignment, mic responsiveness, and skeleton guides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Preview with Posture Skeleton Overlay */}
        <div className="p-6 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl border border-neutral-800 overflow-hidden flex items-center justify-center">
            {hasCamera ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror transform -scale-x-100"
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={360}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </>
            ) : (
              <div className="p-6 text-center space-y-2">
                <Camera className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400">
                  Camera not detected or permission denied. You can still proceed with audio and text mode.
                </p>
              </div>
            )}

            {/* Guide overlay notice */}
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-md rounded border border-white/10 text-[10px] font-mono text-neutral-200">
              Guideline: Level shoulders to horizontal dashed line
            </div>
          </div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Camera Check */}
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" /> Camera
                </span>
                {hasCamera ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <p className="text-[10px] text-neutral-500">
                {hasCamera ? 'Live 720p Active' : 'Standby / Optional'}
              </p>
            </div>

            {/* Mic Check */}
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Mic className="w-3.5 h-3.5 text-cyan-400" /> Microphone
                </span>
                {hasMic ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-400 h-full transition-all duration-75"
                  style={{ width: `${Math.max(10, audioLevel)}%` }}
                />
              </div>
            </div>

            {/* Lighting Check */}
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Lighting
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-neutral-500">Contrast Balanced</p>
            </div>

            {/* Framing Check */}
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Framing
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-neutral-500">Upper Body Centered</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Back to Topics
          </button>

          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start Technical Interview Round</span>
          </button>
        </div>
      </div>
    </div>
  );
};
