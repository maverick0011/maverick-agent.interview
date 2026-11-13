/**
 * External AI Evaluator Client Adapter
 * Bridges interview answers, speech metrics, and posture telemetry to the evaluation engine.
 */

import { 
  CategoryScores, 
  AnswerEvaluation, 
  InterviewQuestion, 
  SpeechMetrics, 
  PostureMetrics, 
  ScoringWeights 
} from '../types';

export interface EvaluatorPayload {
  userId: string;
  attemptId: string;
  questionId: string;
  topic: string;
  question: string;
  expectedKeyPoints: string[];
  transcript: string;
  speechMetrics: {
    wpm: number;
    fillerCount: number;
    pauses: number;
    durationSec: number;
  };
  postureMetrics: {
    goodPosturePct: number;
    events: Array<{ timestampSec: number; type: string; message: string }>;
    avgShoulderTilt: number;
    avgHeadOffset: number;
  };
}

export interface EvaluatorResponse {
  scores: {
    posture: number;
    wordFormation: number;
    communication: number;
    speakingStyle: number;
    answerQuality: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
  };
}

export interface EvaluatorConfig {
  endpoint: string;
  timeoutMs: number;
  strictExternal?: boolean;
  responseMapper?: (raw: unknown) => EvaluatorResponse;
}

export class EvaluatorUnreachableError extends Error {
  public readonly endpoint: string;
  constructor(message: string, endpoint: string) {
    super(message);
    this.name = 'EvaluatorUnreachableError';
    this.endpoint = endpoint;
  }
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  answerQuality: 0.35,
  communication: 0.20,
  wordFormation: 0.15,
  speakingStyle: 0.10,
  posture: 0.20,
};

export class EvaluatorClient {
  private endpoint: string;
  private timeoutMs: number;
  private strictExternal: boolean;
  private responseMapper: (raw: unknown) => EvaluatorResponse;

  constructor(
    endpoint: string = 'http://localhost:8000/api/evaluate',
    timeoutMs: number = 6000
  ) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
    this.strictExternal = false;
    this.responseMapper = (raw: unknown) => raw as EvaluatorResponse;
  }

  public configure(config: Partial<EvaluatorConfig>) {
    if (typeof config.endpoint === 'string' && config.endpoint.trim()) {
      this.endpoint = config.endpoint.trim();
    }
    if (typeof config.timeoutMs === 'number' && config.timeoutMs > 0) {
      this.timeoutMs = config.timeoutMs;
    }
    if (typeof config.strictExternal === 'boolean') {
      this.strictExternal = config.strictExternal;
    }
    if (typeof config.responseMapper === 'function') {
      this.responseMapper = config.responseMapper;
    }
  }

  public setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public setTimeoutMs(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Evaluates an answer through the external local AI evaluator service (or server proxy).
   * If strictExternal is enabled and the evaluator cannot be reached, throws EvaluatorUnreachableError
   * so the UI can let the user retry without losing their recorded answer.
   */
  public async evaluateAnswer(
    payload: EvaluatorPayload,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    options?: { forceLocalFallback?: boolean }
  ): Promise<AnswerEvaluation> {
    if (!options?.forceLocalFallback) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const targetUrl = this.endpoint.startsWith('/')
          ? this.endpoint
          : '/api/mock-interview/evaluate';

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            targetUrl === '/api/mock-interview/evaluate'
              ? { endpoint: this.endpoint, payload }
              : payload
          ),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const raw = await res.json();
          const data = this.responseMapper(raw);
          if (data?.scores) {
            return this.formatEvaluation(payload, data.scores, data.feedback, weights);
          }
        } else if (this.strictExternal) {
          throw new EvaluatorUnreachableError(
            `External evaluator responded with status ${res.status}`,
            this.endpoint
          );
        }
      } catch (err) {
        if (this.strictExternal) {
          if (err instanceof EvaluatorUnreachableError) throw err;
          throw new EvaluatorUnreachableError(
            err instanceof Error ? err.message : 'External AI evaluator is unreachable.',
            this.endpoint
          );
        }
      }
    }

    return this.runLocalFallbackEvaluation(payload, weights);
  }

  /**
   * Internal high-fidelity rubric evaluator assessing the 5 core dimensions:
   * 1. Answer Quality (35%): Technical accuracy, coverage of expected key points
   * 2. Communication Skills (20%): Clarity, fluency, absence of excessive filler words, pace (110-160 WPM ideal)
   * 3. Word Formation (15%): Grammar, technical vocabulary, sentence coherence
   * 4. Way of Talking (10%): Tone, confidence, pause control, fluid delivery
   * 5. Body Posture (20%): Spine alignment, level shoulders, steady eye direction
   */
  private runLocalFallbackEvaluation(
    payload: EvaluatorPayload,
    weights: ScoringWeights
  ): AnswerEvaluation {
    const text = payload.transcript.trim();
    const lower = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Answer Quality / Technical Conveyance (35%)
    const keyPointsCovered: string[] = [];
    const keyPointsMissed: string[] = [];

    payload.expectedKeyPoints.forEach(kp => {
      const tokens = kp.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      const matches = tokens.filter(t => lower.includes(t)).length;
      if (matches >= 2 || (tokens.length <= 2 && matches >= 1)) {
        keyPointsCovered.push(kp);
      } else {
        keyPointsMissed.push(kp);
      }
    });

    const keyPointRatio = payload.expectedKeyPoints.length > 0 
      ? keyPointsCovered.length / payload.expectedKeyPoints.length 
      : 0.5;

    let answerQuality = Math.round(50 + keyPointRatio * 45);
    if (wordCount < 15) answerQuality = Math.min(answerQuality, 45);
    if (wordCount > 60 && keyPointRatio >= 0.5) answerQuality = Math.min(98, answerQuality + 5);

    // 2. Communication Skills (20%)
    // Optimal WPM: 120-160 WPM. Penalize severe filler word density (>5% of words)
    const wpm = payload.speechMetrics.wpm || 120;
    let paceScore = 90;
    if (wpm < 80 || wpm > 190) paceScore = 65;
    else if (wpm < 105 || wpm > 170) paceScore = 80;

    const fillerRate = wordCount > 0 ? (payload.speechMetrics.fillerCount / wordCount) : 0;
    const fillerPenalty = Math.min(30, Math.round(fillerRate * 300));
    const communication = Math.max(40, Math.min(98, Math.round(paceScore - fillerPenalty + (wordCount > 35 ? 8 : 0))));

    // 3. Word Formation (15%)
    // Vocabulary density and sentence structure
    const technicalJargon = ['architecture', 'cluster', 'pipeline', 'deployment', 'latency', 'resilience', 'orchestration', 'idempotent', 'controller', 'reconciliation', 'throughput', 'observability'];
    const jargonMatches = technicalJargon.filter(term => lower.includes(term)).length;
    let wordFormation = Math.min(96, Math.max(50, 65 + jargonMatches * 5 + (wordCount > 40 ? 10 : 0)));

    // 4. Way of Talking / Speaking Style (10%)
    // Confidence, pauses, cadence
    const pauseCount = payload.speechMetrics.pauses || 0;
    let speakingStyle = 82;
    if (pauseCount > 6) speakingStyle -= 12;
    if (lower.includes('i think maybe') || lower.includes('not sure')) speakingStyle -= 8;
    if (lower.includes('specifically') || lower.includes('in our production') || lower.includes('we ensured')) speakingStyle += 8;
    speakingStyle = Math.min(96, Math.max(48, speakingStyle));

    // 5. Body Posture (20%)
    // Live posture tracking percentage + event infractions
    let postureScore = Math.round(payload.postureMetrics.goodPosturePct || 85);
    if (payload.postureMetrics.avgShoulderTilt > 8) postureScore -= 10;
    if (payload.postureMetrics.avgHeadOffset > 45) postureScore -= 12;
    postureScore = Math.min(100, Math.max(35, postureScore));

    const scores: CategoryScores = {
      answerQuality: Math.round(answerQuality),
      communication: Math.round(communication),
      wordFormation: Math.round(wordFormation),
      speakingStyle: Math.round(speakingStyle),
      posture: Math.round(postureScore),
    };

    // Calculate feedback
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (keyPointsCovered.length > 0) {
      strengths.push(`Addressed core technical aspects of ${payload.topic}: ${keyPointsCovered[0].split('(')[0]}`);
    } else {
      strengths.push('Maintained steady verbal composure through response delivery');
    }

    if (scores.posture >= 80) {
      strengths.push('Excellent camera posture and head alignment');
    } else {
      improvements.push('Maintain an upright posture and align shoulders to horizontal guidelines');
    }

    if (fillerRate > 0.04) {
      improvements.push(`Reduce verbal filler words (detected ${payload.speechMetrics.fillerCount} fillers such as "um", "like")`);
    }

    if (keyPointsMissed.length > 0) {
      improvements.push(`Deepen answer by incorporating: ${keyPointsMissed[0]}`);
    }

    if (wpm < 95) {
      improvements.push('Aim for a slightly more energetic delivery pace (120-150 WPM)');
    }

    return this.formatEvaluation(payload, scores, { strengths, improvements }, weights);
  }

  private formatEvaluation(
    payload: EvaluatorPayload,
    scores: CategoryScores,
    feedback: { strengths: string[]; improvements: string[] },
    weights: ScoringWeights
  ): AnswerEvaluation {
    const overallScore = Math.round(
      scores.answerQuality * weights.answerQuality +
      scores.communication * weights.communication +
      scores.wordFormation * weights.wordFormation +
      scores.speakingStyle * weights.speakingStyle +
      scores.posture * weights.posture
    );

    return {
      questionId: payload.questionId,
      topic: payload.topic,
      scores,
      overallScore,
      feedback,
      keyPointsCovered: payload.expectedKeyPoints.slice(0, 2),
      keyPointsMissed: payload.expectedKeyPoints.slice(2),
      suggestedAnswer: `Recommended architectural response:
1. Core Strategy: ${payload.expectedKeyPoints[0] || 'Apply declarative configuration and isolate failure domains'}
2. Operational Controls: ${payload.expectedKeyPoints[1] || 'Implement telemetry guards and automated health checks'}
3. Production Best Practice: ${payload.expectedKeyPoints[2] || 'Document remediation steps with actionable runbooks'}`,
    };
  }
}

export const evaluatorClient = new EvaluatorClient();
