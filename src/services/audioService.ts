/**
 * Maverick AI - Dual Channel Audio Capture & Transcription Engine
 * Separate channels for Interviewer (System Audio) and Candidate (Microphone)
 */

import { AudioChannel, TranscriptSegment } from '../types';

export interface AudioVolumeTelemetry {
  micVolume: number;        // 0 to 100
  systemVolume: number;     // 0 to 100
  isMicActive: boolean;
  isSystemActive: boolean;
  frequencyData: number[];
}

export type TranscriptCallback = (segment: TranscriptSegment) => void;
export type TelemetryCallback = (telemetry: AudioVolumeTelemetry) => void;

class AudioCaptureEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private systemAnalyser: AnalyserNode | null = null;
  private isCapturing = false;
  private animationFrameId: number | null = null;
  private simulationIntervalId: any = null;

  private onTranscriptListeners: Set<TranscriptCallback> = new Set();
  private onTelemetryListeners: Set<TelemetryCallback> = new Set();

  /**
   * Request Microphone Permission via browser or native Electron bridge
   */
  async requestMicPermission(): Promise<boolean> {
    try {
      if ((window as any).maverickNative?.requestMicPermission) {
        return await (window as any).maverickNative.requestMicPermission();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check permissions status
   */
  async checkPermissions(): Promise<{ mic: boolean; systemAudio: boolean }> {
    if ((window as any).maverickNative?.checkPermissions) {
      const res = await (window as any).maverickNative.checkPermissions();
      return {
        mic: res.mic === 'granted',
        systemAudio: res.systemAudio === 'granted' || res.screen === 'granted',
      };
    }
    return { mic: true, systemAudio: true };
  }

  /**
   * Start Dual-Channel Audio Capture
   */
  async startCapture(options?: { captureSystemAudio?: boolean }): Promise<void> {
    if (this.isCapturing) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    try {
      // 1. Microphone (Candidate Channel)
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.audioCtx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      micSource.connect(this.micAnalyser);
    } catch (err) {
      console.warn('Microphone capture fallback:', err);
    }

    // 2. System Audio (Interviewer Channel) via ScreenCaptureKit / DisplayMedia Audio
    if (options?.captureSystemAudio) {
      try {
        if (navigator.mediaDevices.getDisplayMedia) {
          // Captures system audio from browser meeting tabs / desktop apps
          this.systemStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          // Disable video tracks to conserve CPU/GPU
          this.systemStream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });

          if (this.systemStream.getAudioTracks().length > 0) {
            const sysSource = this.audioCtx.createMediaStreamSource(this.systemStream);
            this.systemAnalyser = this.audioCtx.createAnalyser();
            this.systemAnalyser.fftSize = 64;
            sysSource.connect(this.systemAnalyser);
          }
        }
      } catch (err) {
        console.info('System audio capture optional or skipped:', err);
      }
    }

    this.isCapturing = true;
    this.startTelemetryLoop();
  }

  /**
   * Stop Audio Capture
   */
  stopCapture(): void {
    this.isCapturing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.systemStream) {
      this.systemStream.getTracks().forEach(t => t.stop());
      this.systemStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  getIsCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Subscribe to transcript segments
   */
  onTranscript(cb: TranscriptCallback): () => void {
    this.onTranscriptListeners.add(cb);
    return () => this.onTranscriptListeners.delete(cb);
  }

  /**
   * Subscribe to live audio volume & waveform telemetry
   */
  onTelemetry(cb: TelemetryCallback): () => void {
    this.onTelemetryListeners.add(cb);
    return () => this.onTelemetryListeners.delete(cb);
  }

  /**
   * Emit a transcript segment
   */
  emitSegment(channel: AudioChannel, text: string): TranscriptSegment {
    const isQuestion = this.detectQuestion(text, channel);
    const topics = this.extractTopics(text);
    const segment: TranscriptSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      channel,
      text,
      timestamp: this.getCurrentTimestamp(),
      confidence: 0.96,
      isQuestion,
      detectedTopics: topics,
    };

    this.onTranscriptListeners.forEach(cb => cb(segment));
    return segment;
  }

  /**
   * Start Simulated Interviewer Audio for realistic live testing
   */
  startSimulatedDialogue(): void {
    const interviewQuestions = [
      "Can you walk me through your experience managing Kubernetes clusters at scale?",
      "How do you troubleshoot a pod stuck in CrashLoopBackOff with exit code 137?",
      "Suppose your AWS multi-region deployment experiences a 503 error spike during peak hours. What is your immediate incident response workflow?",
      "How do you manage Terraform state locking across a team of 50+ engineers to prevent race conditions?",
      "Can you explain your approach to defining SLIs, SLOs, and error budgets for high-throughput microservices?",
      "What strategy do you use for zero-downtime database schema migrations in production?",
    ];

    let qIdx = 0;
    this.simulationIntervalId = setInterval(() => {
      if (!this.isCapturing) return;

      const q = interviewQuestions[qIdx % interviewQuestions.length];
      qIdx++;

      this.emitSegment('interviewer', q);
    }, 18000);
  }

  private startTelemetryLoop(): void {
    const micData = new Uint8Array(32);
    const sysData = new Uint8Array(32);

    const update = () => {
      if (!this.isCapturing) return;

      let micVol = 0;
      let sysVol = 0;

      if (this.micAnalyser) {
        this.micAnalyser.getByteFrequencyData(micData);
        let sum = 0;
        for (let i = 0; i < micData.length; i++) sum += micData[i];
        micVol = Math.min(100, Math.round((sum / micData.length / 255) * 100 * 2.2));
      }

      if (this.systemAnalyser) {
        this.systemAnalyser.getByteFrequencyData(sysData);
        let sum = 0;
        for (let i = 0; i < sysData.length; i++) sum += sysData[i];
        sysVol = Math.min(100, Math.round((sum / sysData.length / 255) * 100 * 2.2));
      }

      // Convert to visual frequencies
      const frequencies = Array.from(micData).slice(0, 16).map(v => v / 255);

      this.onTelemetryListeners.forEach(cb => cb({
        micVolume: micVol,
        systemVolume: sysVol,
        isMicActive: micVol > 8,
        isSystemActive: sysVol > 8,
        frequencyData: frequencies,
      }));

      this.animationFrameId = requestAnimationFrame(update);
    };

    update();
  }

  private detectQuestion(text: string, channel: AudioChannel): boolean {
    if (channel === 'interviewer') {
      const qKeywords = ['how', 'what', 'why', 'can you', 'could you', 'explain', 'describe', 'tell me', 'suppose', 'walk me through', '?'];
      const lower = text.toLowerCase();
      return qKeywords.some(kw => lower.includes(kw));
    }
    return text.trim().endsWith('?');
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lower = text.toLowerCase();
    const map: Record<string, string> = {
      'kubernetes': 'Kubernetes',
      'k8s': 'Kubernetes',
      'pod': 'Kubernetes Pods',
      'crashloop': 'CrashLoopBackOff',
      'oom': 'OOMKilled',
      'aws': 'AWS Cloud',
      'eks': 'AWS EKS',
      'route 53': 'Route 53',
      'terraform': 'Terraform IaC',
      'docker': 'Docker Containers',
      'prometheus': 'Prometheus / SRE',
      'grafana': 'Grafana',
      '503': 'HTTP 503 Errors',
      'slo': 'SRE / SLOs',
      'ci/cd': 'CI/CD Pipelines',
      'incident': 'Incident Management',
    };

    for (const [key, label] of Object.entries(map)) {
      if (lower.includes(key) && !topics.includes(label)) {
        topics.push(label);
      }
    }
    return topics.slice(0, 3);
  }

  private getCurrentTimestamp(): string {
    const d = new Date();
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${min}:${sec}`;
  }
}

export const audioEngine = new AudioCaptureEngine();
