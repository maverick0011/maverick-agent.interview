export type AudioChannel = 'interviewer' | 'candidate';

export type AnswerMode = 
  | 'crisp' 
  | 'conversational' 
  | 'senior' 
  | 'star' 
  | 'troubleshooting' 
  | 'architecture' 
  | 'coding';

export interface TranscriptSegment {
  id: string;
  channel: AudioChannel;
  text: string;
  timestamp: string;
  confidence: number;
  isQuestion?: boolean;
  detectedTopics?: string[];
}

export interface GroundedSource {
  documentId: string;
  documentTitle: string;
  snippet: string;
  relevance: number;
}

export interface AIResponse {
  id: string;
  sessionId?: string;
  questionText: string;
  answerText: string;
  mode: AnswerMode;
  category: 'devops' | 'sre' | 'kubernetes' | 'aws' | 'system_design' | 'behavioral' | 'coding' | 'general';
  timestamp: string;
  latencyMs: number;
  tokenCount?: number;
  groundedSources: GroundedSource[];
  isStreaming?: boolean;
  pinned?: boolean;
}

export interface InterviewSession {
  id: string;
  title: string;
  role: string;
  company?: string;
  createdAt: string;
  durationSeconds: number;
  transcripts: TranscriptSegment[];
  responses: AIResponse[];
  summary?: string;
  actionItems?: string[];
  keyTopics?: string[];
}

export interface ResumeProfile {
  id: string;
  candidateName: string;
  targetRole: string;
  yearsOfExperience: number;
  summary: string;
  skills: {
    category: string;
    items: string[];
  }[];
  experience: {
    id: string;
    company: string;
    role: string;
    duration: string;
    highlights: string[];
  }[];
  projects: {
    id: string;
    name: string;
    description: string;
    technologies: string[];
    metrics?: string;
  }[];
  rawText?: string;
  uploadedAt: string;
}

export interface JobDescription {
  id: string;
  title: string;
  company: string;
  rawText: string;
  parsedRequirements: string[];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: 'resume' | 'architecture' | 'notes' | 'runbook' | 'cheatsheet';
  chunksCount: number;
  sizeBytes: number;
  lastIndexed: string;
  summary?: string;
  content: string;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  content: string;
  embedding?: number[];
  chunkIndex: number;
}

export interface MockInterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'intermediate' | 'senior' | 'staff';
  expectedKeyPoints: string[];
  userAnswer?: string;
  evaluation?: {
    technicalScore: number; // 0-100
    problemSolvingScore: number;
    communicationScore: number;
    practicalExperienceScore: number;
    confidenceScore: number;
    strengths: string[];
    improvements: string[];
    modelAnswer: string;
  };
}

export interface MockInterviewSession {
  id: string;
  title: string;
  track: 'devops' | 'sre' | 'platform' | 'kubernetes' | 'system_design' | 'behavioral';
  difficulty: 'intermediate' | 'senior' | 'staff';
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  questions: MockInterviewQuestion[];
  overallScore?: number;
  feedbackSummary?: string;
  createdAt: string;
}

export interface SystemDesignDiagram {
  id: string;
  title: string;
  prompt: string;
  architectureType: 'microservices' | 'event_driven' | 'kubernetes_cloud' | 'serverless' | 'observability';
  mermaidCode: string;
  explanation: string;
  scaleRequirements: {
    qps: string;
    storage: string;
    latency: string;
    availability: string;
  };
  components: {
    name: string;
    technology: string;
    purpose: string;
  }[];
  tradeoffs: string[];
  createdAt: string;
}

export interface CodeAssistantSnippet {
  id: string;
  title: string;
  language: 'python' | 'bash' | 'terraform' | 'dockerfile' | 'kubernetes' | 'jenkinsfile' | 'sql' | 'github_actions';
  code: string;
  explanation: string;
  executionSafety: 'safe' | 'caution' | 'dangerous_mutation';
  safetyWarning?: string;
  suggestedImprovements?: string[];
  createdAt: string;
}

export interface OllamaModelInfo {
  name: string;
  tag: string;
  size: string;
  modifiedAt: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
  status: 'ready' | 'downloading' | 'loading' | 'missing';
  downloadProgress?: number; // 0-100
}

export interface ModelDoctorReport {
  timestamp: string;
  ollamaRunning: boolean;
  ollamaEndpoint: string;
  qwenLoaded: boolean;
  primaryModelName: string;
  inferenceLatencyMs: number | null;
  whisperEngineReady: boolean;
  systemAudioPermissionGranted: boolean;
  microphonePermissionGranted: boolean;
  memoryAvailableGB: number;
  sqliteStorageHealthy: boolean;
  allChecksPassed: boolean;
  recommendations: string[];
}

export interface AppSettings {
  ollamaEndpoint: string;
  primaryModel: string;
  contextLength: number;
  temperature: number;
  maxOutputTokens: number;
  whisperModel: 'tiny' | 'base' | 'small';
  selectedMicId: string;
  systemAudioCaptureEnabled: boolean;
  screenSharePrivacyEnabled: boolean;
  floatingOpacity: number;
  defaultAnswerMode: AnswerMode;
  theme: 'dark' | 'light';
  telemetryEnabled: boolean;
  soundAlertsEnabled: boolean;
  shortcuts: {
    toggleFloating: string;
    quickAskAI: string;
    pauseResumeCapture: string;
    clearTranscript: string;
  };
}
