/**
 * Mock Interview Module - Domain Types
 * Modular contract for technical DevOps / Cloud interview simulations.
 */

export type InterviewTrack = 'devops' | 'sre' | 'kubernetes' | 'platform' | 'behavioral';

export type SeniorityLevel = 'beginner' | 'intermediate' | 'senior' | 'staff' | 'mixed';

export type ToolTopic = 
  | 'Linux'
  | 'Shell Scripting'
  | 'Jenkins'
  | 'AWS'
  | 'GCP'
  | 'Docker'
  | 'Kubernetes'
  | 'Argo CD'
  | 'Karpenter'
  | 'Python';

export type QuestionType = 'conceptual' | 'scenario' | 'troubleshooting' | 'hands-on';

export interface InterviewQuestion {
  id: string;
  topic: ToolTopic | string;
  track?: InterviewTrack;
  difficulty: SeniorityLevel;
  type: QuestionType;
  question: string;
  expectedKeyPoints: string[];
  followUp?: string;
  hash: string;
}

export interface SpeechMetrics {
  durationSec: number;
  wordCount: number;
  wpm: number;
  fillerCount: number;
  fillerWords: Record<string, number>;
  pauseCount: number;
  averagePauseSec: number;
}

export interface PostureEvent {
  timestampSec: number;
  type: 'slouching' | 'shoulder_tilt' | 'forward_head' | 'leaning' | 'looking_away' | 'fidgeting' | 'good';
  message: string;
  severity: 'normal' | 'warning' | 'alert';
}

export interface PostureMetrics {
  goodPosturePct: number;
  avgShoulderTiltDeg: number;
  avgHeadOffsetPx: number;
  slouchCount: number;
  events: PostureEvent[];
}

export interface CategoryScores {
  answerQuality: number;      // 35% weight: Technical accuracy, structure, completeness
  communication: number;      // 20% weight: Clarity, fluency, filler words, pace
  wordFormation: number;      // 15% weight: Grammar, vocabulary, sentence structure
  speakingStyle: number;      // 10% weight: Tone, confidence, pause control
  posture: number;            // 20% weight: Spine alignment, shoulder balance, eye direction
}

export interface AnswerEvaluation {
  questionId: string;
  topic: string;
  scores: CategoryScores;
  overallScore: number;
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  keyPointsCovered: string[];
  keyPointsMissed: string[];
  suggestedAnswer: string;
}

export interface AnswerRecord {
  questionId: string;
  topic: string;
  questionText: string;
  expectedKeyPoints: string[];
  transcript: string;
  speechMetrics: SpeechMetrics;
  postureMetrics: PostureMetrics;
  evaluation?: AnswerEvaluation;
  skipped?: boolean;
}

export interface InterviewSessionConfig {
  track: InterviewTrack;
  seniority: SeniorityLevel;
  selectedTopics: ToolTopic[];
  questionCount: number;
  timePerAnswerSec: number;
  thinkingTimeSec: number;
  readAloud: boolean;
}

export interface InterviewAttempt {
  id: string;
  userId: string;
  candidateName: string;
  track: InterviewTrack;
  seniority: SeniorityLevel;
  selectedTopics: ToolTopic[];
  startedAt: string;
  endedAt?: string;
  questions: InterviewQuestion[];
  answers: AnswerRecord[];
  overallScore: number;
  categoryScores: CategoryScores;
  passed: boolean; // true if overallScore >= 80
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface UserInterviewStatus {
  userId: string;
  topicSetKey: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  bestScore: number;
  latestScore: number;
  attemptCount: number;
  completedAt?: string;
}

export interface ScoringWeights {
  answerQuality: number; // default 0.35
  communication: number; // default 0.20
  wordFormation: number; // default 0.15
  speakingStyle: number; // default 0.10
  posture: number;       // default 0.20
}

export interface InterviewSettings {
  passThreshold: number; // default 80
  weights: ScoringWeights;
  defaultQuestionsPerSession: number; // default 10
  defaultTimePerAnswerSec: number;    // default 120
}
