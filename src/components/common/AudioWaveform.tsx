import React, { useEffect, useState } from 'react';
import { audioEngine, AudioVolumeTelemetry } from '../../services/audioService';
import { Mic, Volume2 } from 'lucide-react';

interface AudioWaveformProps {
  compact?: boolean;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ compact = false }) => {
  const [telemetry, setTelemetry] = useState<AudioVolumeTelemetry>({
    micVolume: 0,
    systemVolume: 0,
    isMicActive: false,
    isSystemActive: false,
    frequencyData: Array(16).fill(0.05),
  });

  useEffect(() => {
    const unsub = audioEngine.onTelemetry(t => {
      setTelemetry(t);
    });
    return unsub;
  }, []);

  const isCapturing = audioEngine.getIsCapturing();

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 text-indigo-400">
          <Mic className="w-3.5 h-3.5" />
          <div className="w-12 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-75"
              style={{ width: `${isCapturing ? Math.max(8, telemetry.micVolume) : 0}%` }}
            />
          </div>
        </div>
        <div className="h-3 w-px bg-neutral-800" />
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Volume2 className="w-3.5 h-3.5" />
          <div className="w-12 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-75"
              style={{ width: `${isCapturing ? Math.max(8, telemetry.systemVolume) : 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="text-neutral-400 font-medium">Dual-Channel Audio Tap</span>
        <span className="font-mono text-neutral-500">
          {isCapturing ? '16kHz PCM · CoreAudio / ScreenCaptureKit' : 'Engine Idle'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Interviewer (System Audio Channel) */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-lg">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Volume2 className="w-3.5 h-3.5" />
              INTERVIEWER (System Audio)
            </span>
            <span className="font-mono text-cyan-300 tabular-nums">
              {isCapturing ? `${telemetry.systemVolume}%` : '0%'}
            </span>
          </div>
          {/* Waveform Bars */}
          <div className="flex items-end gap-1 h-8 px-1">
            {telemetry.frequencyData.map((f, i) => {
              const height = isCapturing 
                ? Math.max(12, Math.round((f * 0.8 + (telemetry.systemVolume / 100) * 0.7) * 32))
                : 4;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-75 bg-cyan-500/80"
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>

        {/* Candidate (Microphone Channel) */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-lg">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <Mic className="w-3.5 h-3.5" />
              CANDIDATE (Microphone)
            </span>
            <span className="font-mono text-indigo-300 tabular-nums">
              {isCapturing ? `${telemetry.micVolume}%` : '0%'}
            </span>
          </div>
          {/* Waveform Bars */}
          <div className="flex items-end gap-1 h-8 px-1">
            {telemetry.frequencyData.map((f, i) => {
              const height = isCapturing 
                ? Math.max(12, Math.round((f * 0.9 + (telemetry.micVolume / 100) * 0.8) * 32))
                : 4;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-75 bg-indigo-500/80"
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
