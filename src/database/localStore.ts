import { 
  AppSettings, 
  InterviewSession, 
  ResumeProfile, 
  KnowledgeDocument, 
  MockInterviewSession, 
  SystemDesignDiagram, 
  CodeAssistantSnippet,
  AIResponse
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
};

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
    return this.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
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
  }
}

export const localStore = new LocalStorageDB();
