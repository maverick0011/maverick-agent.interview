import { 
  AppSettings, 
  InterviewSession, 
  ResumeProfile, 
  KnowledgeDocument, 
  MockInterviewSession, 
  SystemDesignDiagram, 
  CodeAssistantSnippet,
  AIResponse,
  UserProfile,
  AccessRequest,
  ProctoredLiveFeed,
  InterviewAttempt,
  UserInterviewStatus,
  InterviewSettings
} from '../types';
import { DEFAULT_SETTINGS, INITIAL_RESUME, INITIAL_KNOWLEDGE_DOCS, INITIAL_SESSIONS } from './seedData';

const STORAGE_KEYS = {
  SETTINGS: 'maverick_settings_v1',
  RESUME: 'maverick_resume_v1',
  KNOWLEDGE: 'maverick_knowledge_v1',
  SESSIONS: 'maverick_sessions_v1',
  RESPONSES: 'maverick_responses_v1',
  MOCK_INTERVIEWS: 'maverick_mocks_v1',
  SYSTEM_DESIGNS: 'maverick_designs_v1',
  CODE_SNIPPETS: 'maverick_code_v1',
  WIZARD_COMPLETED: 'maverick_wizard_done_v1',
  CURRENT_USER: 'maverick_current_user_v1',
  ACCESS_REQUESTS: 'maverick_access_requests_v1',
  PROCTORED_FEEDS: 'maverick_proctored_feeds_v1',
  INTERVIEW_ATTEMPTS: 'maverick_interview_attempts_v2',
  USER_INTERVIEW_STATUS: 'maverick_user_interview_status_v2',
  INTERVIEW_SETTINGS: 'maverick_interview_settings_v2',
  USER_ACTIVITY_LOGS: 'maverick_user_activity_logs_v1',
};

export const ADMIN_EMAILS: string[] = [
  'mavbharath01@gmail.com',
];

export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(admin => admin.toLowerCase() === email.trim().toLowerCase());
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: 'login' | 'mock_interview_start' | 'mock_interview_complete' | 'access_requested' | 'copilot_active';
  description: string;
  timestamp: string;
}

class LocalStorageDB {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`LocalStore failed to set key: ${key}`, err);
    }
  }

  // --- Settings ---
  getSettings(): AppSettings {
    const settings = this.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    // Migrate older direct-Ollama settings to the loopback-only local backend proxy.
    if (settings.ollamaEndpoint === 'http://localhost:11434' ||
        settings.ollamaEndpoint === 'http://127.0.0.1:11434') {
      const migrated = { ...settings, ollamaEndpoint: 'http://127.0.0.1:3001/ollama' };
      this.set(STORAGE_KEYS.SETTINGS, migrated);
      return migrated;
    }
    return settings;
  }

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    this.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  isWizardCompleted(): boolean {
    return this.get<boolean>(STORAGE_KEYS.WIZARD_COMPLETED, false);
  }

  setWizardCompleted(completed: boolean): void {
    this.set(STORAGE_KEYS.WIZARD_COMPLETED, completed);
  }

  // --- Resume Profile ---
  getResume(): ResumeProfile {
    return this.get<ResumeProfile>(STORAGE_KEYS.RESUME, INITIAL_RESUME);
  }

  saveResume(profile: ResumeProfile): void {
    this.set(STORAGE_KEYS.RESUME, profile);
  }

  // --- Knowledge Documents ---
  getKnowledgeDocs(): KnowledgeDocument[] {
    return this.get<KnowledgeDocument[]>(STORAGE_KEYS.KNOWLEDGE, INITIAL_KNOWLEDGE_DOCS);
  }

  saveKnowledgeDoc(doc: KnowledgeDocument): void {
    const docs = this.getKnowledgeDocs();
    const existingIndex = docs.findIndex(d => d.id === doc.id);
    if (existingIndex >= 0) {
      docs[existingIndex] = doc;
    } else {
      docs.unshift(doc);
    }
    this.set(STORAGE_KEYS.KNOWLEDGE, docs);
  }

  deleteKnowledgeDoc(id: string): void {
    const docs = this.getKnowledgeDocs().filter(d => d.id !== id);
    this.set(STORAGE_KEYS.KNOWLEDGE, docs);
  }

  // --- Sessions & Transcripts ---
  getSessions(): InterviewSession[] {
    return this.get<InterviewSession[]>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS);
  }

  getSessionById(id: string): InterviewSession | undefined {
    return this.getSessions().find(s => s.id === id);
  }

  saveSession(session: InterviewSession): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    this.set(STORAGE_KEYS.SESSIONS, sessions);
  }

  deleteSession(id: string): void {
    const sessions = this.getSessions().filter(s => s.id !== id);
    this.set(STORAGE_KEYS.SESSIONS, sessions);
  }

  clearAllSessions(): void {
    this.set(STORAGE_KEYS.SESSIONS, []);
  }

  // --- AI Responses ---
  getAIResponses(): AIResponse[] {
    const sessions = this.getSessions();
    const fromSessions = sessions.flatMap(s => s.responses || []);
    const directResponses = this.get<AIResponse[]>(STORAGE_KEYS.RESPONSES, []);
    const mergedMap = new Map<string, AIResponse>();
    [...fromSessions, ...directResponses].forEach(r => mergedMap.set(r.id, r));
    return Array.from(mergedMap.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  saveAIResponse(response: AIResponse): void {
    const responses = this.get<AIResponse[]>(STORAGE_KEYS.RESPONSES, []);
    const filtered = responses.filter(r => r.id !== response.id);
    filtered.unshift(response);
    this.set(STORAGE_KEYS.RESPONSES, filtered);
  }

  // --- Mock Interviews ---
  getMockInterviews(): MockInterviewSession[] {
    return this.get<MockInterviewSession[]>(STORAGE_KEYS.MOCK_INTERVIEWS, []);
  }

  saveMockInterview(mock: MockInterviewSession): void {
    const mocks = this.getMockInterviews();
    const index = mocks.findIndex(m => m.id === mock.id);
    if (index >= 0) {
      mocks[index] = mock;
    } else {
      mocks.unshift(mock);
    }
    this.set(STORAGE_KEYS.MOCK_INTERVIEWS, mocks);
  }

  // --- System Design Diagrams ---
  getSystemDesigns(): SystemDesignDiagram[] {
    return this.get<SystemDesignDiagram[]>(STORAGE_KEYS.SYSTEM_DESIGNS, []);
  }

  saveSystemDesign(diagram: SystemDesignDiagram): void {
    const list = this.getSystemDesigns();
    const index = list.findIndex(d => d.id === diagram.id);
    if (index >= 0) {
      list[index] = diagram;
    } else {
      list.unshift(diagram);
    }
    this.set(STORAGE_KEYS.SYSTEM_DESIGNS, list);
  }

  // --- Code Snippets ---
  getCodeSnippets(): CodeAssistantSnippet[] {
    return this.get<CodeAssistantSnippet[]>(STORAGE_KEYS.CODE_SNIPPETS, []);
  }

  saveCodeSnippet(snippet: CodeAssistantSnippet): void {
    const list = this.getCodeSnippets();
    const index = list.findIndex(s => s.id === snippet.id);
    if (index >= 0) {
      list[index] = snippet;
    } else {
      list.unshift(snippet);
    }
    this.set(STORAGE_KEYS.CODE_SNIPPETS, list);
  }

  // --- Full Backup & Restore ---
  exportFullBackup(): string {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      resume: this.getResume(),
      knowledge: this.getKnowledgeDocs(),
      sessions: this.getSessions(),
      mockInterviews: this.getMockInterviews(),
      systemDesigns: this.getSystemDesigns(),
      codeSnippets: this.getCodeSnippets(),
    };
    return JSON.stringify(payload, null, 2);
  }

  importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.set(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.resume) this.set(STORAGE_KEYS.RESUME, data.resume);
      if (data.knowledge) this.set(STORAGE_KEYS.KNOWLEDGE, data.knowledge);
      if (data.sessions) this.set(STORAGE_KEYS.SESSIONS, data.sessions);
      if (data.mockInterviews) this.set(STORAGE_KEYS.MOCK_INTERVIEWS, data.mockInterviews);
      if (data.systemDesigns) this.set(STORAGE_KEYS.SYSTEM_DESIGNS, data.systemDesigns);
      if (data.codeSnippets) this.set(STORAGE_KEYS.CODE_SNIPPETS, data.codeSnippets);
      return true;
    } catch (err) {
      console.error('Failed to import backup:', err);
      return false;
    }
  }

  // --- User Authentication & Access Control ---
  getCurrentUser(): UserProfile {
    return this.get<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null) as UserProfile;
  }

  setCurrentUser(user: UserProfile): void {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  getAccessRequests(): AccessRequest[] {
    return this.get<AccessRequest[]>(STORAGE_KEYS.ACCESS_REQUESTS, []);
  }

  submitAccessRequest(data: Omit<AccessRequest, 'id' | 'createdAt' | 'status'>): AccessRequest {
    const requests = this.getAccessRequests();
    const newReq: AccessRequest = {
      ...data,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    requests.unshift(newReq);
    this.set(STORAGE_KEYS.ACCESS_REQUESTS, requests);
    return newReq;
  }

  approveAccessRequest(id: string, approvedBy = 'mavbharath01@gmail.com'): void {
    const requests = this.getAccessRequests();
    const target = requests.find(r => r.id === id);
    if (target) {
      target.status = 'approved';
      target.approvedAt = new Date().toISOString();
      target.approvedBy = approvedBy;
      this.set(STORAGE_KEYS.ACCESS_REQUESTS, requests);

      // If current user is this requester, update their approved status
      const currentUser = this.getCurrentUser();
      if (currentUser.email.toLowerCase() === target.email.toLowerCase()) {
        currentUser.isApproved = true;
        this.setCurrentUser(currentUser);
      }

      this.logUserActivity({
        userId: target.id,
        userEmail: target.email,
        userName: target.fullName,
        action: 'access_requested',
        description: `Login access approved by administrator ${approvedBy}`,
      });
    }
  }

  // --- User Activity Logging (Visible to mavbharath01@gmail.com) ---
  getUserActivityLogs(): UserActivityLog[] {
    return this.get<UserActivityLog[]>(STORAGE_KEYS.USER_ACTIVITY_LOGS, []);
  }

  logUserActivity(log: Omit<UserActivityLog, 'id' | 'timestamp'>): void {
    const logs = this.getUserActivityLogs();
    const newLog: UserActivityLog = {
      ...log,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.USER_ACTIVITY_LOGS, logs.slice(0, 100)); // retain latest 100
  }

  rejectAccessRequest(id: string): void {
    const requests = this.getAccessRequests();
    const target = requests.find(r => r.id === id);
    if (target) {
      target.status = 'rejected';
      this.set(STORAGE_KEYS.ACCESS_REQUESTS, requests);
    }
  }

  // --- Proctored Live Feeds (For Admin Dashboard & Mock Interviews) ---
  getProctoredFeeds(): ProctoredLiveFeed[] {
    return this.get<ProctoredLiveFeed[]>(STORAGE_KEYS.PROCTORED_FEEDS, []);
  }

  updateProctoredFeed(feed: ProctoredLiveFeed): void {
    const feeds = this.getProctoredFeeds();
    const idx = feeds.findIndex(f => f.sessionId === feed.sessionId);
    if (idx >= 0) {
      feeds[idx] = feed;
    } else {
      feeds.unshift(feed);
    }
    this.set(STORAGE_KEYS.PROCTORED_FEEDS, feeds);
  }

  removeProctoredFeed(sessionId: string): void {
    const feeds = this.getProctoredFeeds().filter(f => f.sessionId !== sessionId);
    this.set(STORAGE_KEYS.PROCTORED_FEEDS, feeds);
  }

  // --- Mock Interview Attempts & Completion Rules ---
  getInterviewAttempts(): InterviewAttempt[] {
    return this.get<InterviewAttempt[]>(STORAGE_KEYS.INTERVIEW_ATTEMPTS, []);
  }

  saveInterviewAttempt(attempt: InterviewAttempt): void {
    const attempts = this.getInterviewAttempts();
    const idx = attempts.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      attempts[idx] = attempt;
    } else {
      attempts.unshift(attempt);
    }
    this.set(STORAGE_KEYS.INTERVIEW_ATTEMPTS, attempts);

    // Update user interview status (Pass threshold: 80%)
    this.updateUserInterviewStatus(attempt);
  }

  getUserInterviewStatuses(): UserInterviewStatus[] {
    return this.get<UserInterviewStatus[]>(STORAGE_KEYS.USER_INTERVIEW_STATUS, [
      {
        userId: 'user-student-alex',
        topicSetKey: 'devops-senior-linux-docker-k8s',
        status: 'Completed',
        bestScore: 88,
        latestScore: 88,
        attemptCount: 2,
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        userId: 'user-sumanth',
        topicSetKey: 'sre-senior-aws-karpenter',
        status: 'In Progress',
        bestScore: 74,
        latestScore: 74,
        attemptCount: 1,
      },
    ]);
  }

  private updateUserInterviewStatus(attempt: InterviewAttempt): void {
    const statuses = this.getUserInterviewStatuses();
    const topicKey = `${attempt.track}-${attempt.seniority}-${attempt.selectedTopics.sort().join('-')}`;
    let record = statuses.find(s => s.userId === attempt.userId && s.topicSetKey === topicKey);

    const isPassedNow = attempt.overallScore >= 80;

    if (!record) {
      record = {
        userId: attempt.userId,
        topicSetKey: topicKey,
        status: isPassedNow ? 'Completed' : 'In Progress',
        bestScore: attempt.overallScore,
        latestScore: attempt.overallScore,
        attemptCount: 1,
        completedAt: isPassedNow ? new Date().toISOString() : undefined,
      };
      statuses.unshift(record);
    } else {
      record.attemptCount++;
      record.latestScore = attempt.overallScore;
      record.bestScore = Math.max(record.bestScore, attempt.overallScore);

      // Once marked COMPLETED, status must NOT be revoked by a later lower score!
      if (isPassedNow && record.status !== 'Completed') {
        record.status = 'Completed';
        record.completedAt = new Date().toISOString();
      }
    }

    this.set(STORAGE_KEYS.USER_INTERVIEW_STATUS, statuses);
  }

  getInterviewSettings(): InterviewSettings {
    return this.get<InterviewSettings>(STORAGE_KEYS.INTERVIEW_SETTINGS, {
      passThreshold: 80,
      weights: {
        answerQuality: 0.35,
        communication: 0.20,
        wordFormation: 0.15,
        speakingStyle: 0.10,
        posture: 0.20,
      },
      defaultQuestionsPerSession: 10,
      defaultTimePerAnswerSec: 120,
    });
  }

  updateInterviewSettings(settings: Partial<InterviewSettings>): InterviewSettings {
    const current = this.getInterviewSettings();
    const updated = { ...current, ...settings };
    this.set(STORAGE_KEYS.INTERVIEW_SETTINGS, updated);
    return updated;
  }

  wipeAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.RESUME);
    localStorage.removeItem(STORAGE_KEYS.KNOWLEDGE);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.RESPONSES);
    localStorage.removeItem(STORAGE_KEYS.MOCK_INTERVIEWS);
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_DESIGNS);
    localStorage.removeItem(STORAGE_KEYS.CODE_SNIPPETS);
    localStorage.removeItem(STORAGE_KEYS.WIZARD_COMPLETED);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.PROCTORED_FEEDS);
  }
}

export const localStore = new LocalStorageDB();
