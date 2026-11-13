/**
 * Maverick AI - Video Proctoring & Real-time Live Stream Service
 * Captures student webcam during mock interviews and streams telemetry & video snapshots to Admin Monitor
 */

import { ProctoredLiveFeed } from '../types';
import { localStore } from '../database/localStore';

class VideoProctorService {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private broadcastInterval: any = null;
  private isProctoringActive = false;
  private currentSessionId: string | null = null;

  /**
   * Request webcam access and initialize live video stream
   */
  async startCamera(videoElementTarget?: HTMLVideoElement): Promise<MediaStream | null> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // audio is handled by audioService
      });

      if (videoElementTarget) {
        videoElementTarget.srcObject = this.mediaStream;
        videoElementTarget.play().catch(() => {});
        this.videoElement = videoElementTarget;
      }

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 320;
      this.canvasElement.height = 240;

      return this.mediaStream;
    } catch (err) {
      console.warn('Webcam capture notice (optional or permission pending):', err);
      return null;
    }
  }

  /**
   * Start broadcasting proctored session telemetry to Admin monitor
   */
  startProctoringBroadcast(params: {
    sessionId: string;
    studentId: string;
    studentName: string;
    track: string;
    difficulty: string;
    currentQuestion: string;
    totalQuestions: number;
    currentQuestionIndex: number;
  }) {
    this.currentSessionId = params.sessionId;
    this.isProctoringActive = true;

    const pushUpdate = () => {
      if (!this.isProctoringActive || !this.currentSessionId) return;

      let snapshotDataUrl: string | undefined;

      // Capture frame from active video element if available
      if (this.videoElement && this.canvasElement && this.videoElement.readyState >= 2) {
        try {
          const ctx = this.canvasElement.getContext('2d');
          if (ctx) {
            ctx.drawImage(this.videoElement, 0, 0, 320, 240);
            snapshotDataUrl = this.canvasElement.toDataURL('image/jpeg', 0.5);
          }
        } catch {
          // Canvas capture failure fallback
        }
      }

      const feed: ProctoredLiveFeed = {
        sessionId: params.sessionId,
        studentId: params.studentId,
        studentName: params.studentName,
        track: params.track,
        difficulty: params.difficulty,
        startedAt: new Date().toISOString(),
        currentQuestionIndex: params.currentQuestionIndex,
        totalQuestions: params.totalQuestions,
        currentQuestion: params.currentQuestion,
        currentTranscript: 'Session initialized — waiting for candidate response...',
        videoFrameDataUrl: snapshotDataUrl,
        isCameraActive: !!this.mediaStream && this.mediaStream.active,
        isAudioActive: true,
        status: 'live',
        lastHeartbeat: new Date().toISOString(),
      };

      localStore.updateProctoredFeed(feed);
    };

    pushUpdate();
    this.broadcastInterval = setInterval(pushUpdate, 2500);
  }

  updateLiveTelemetry(updates: Partial<ProctoredLiveFeed>) {
    if (!this.currentSessionId) return;
    const feeds = localStore.getProctoredFeeds();
    const existing = feeds.find(f => f.sessionId === this.currentSessionId);
    if (existing) {
      localStore.updateProctoredFeed({
        ...existing,
        ...updates,
        lastHeartbeat: new Date().toISOString(),
      });
    }
  }

  stopProctoring() {
    this.isProctoringActive = false;
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.currentSessionId) {
      localStore.removeProctoredFeed(this.currentSessionId);
      this.currentSessionId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }

  isCapturing(): boolean {
    return !!this.mediaStream && this.mediaStream.active;
  }
}

export const videoProctorService = new VideoProctorService();
