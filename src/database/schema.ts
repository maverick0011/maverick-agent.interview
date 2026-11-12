/**
 * SQLite Database Schema and Migration Definitions for Maverick AI
 * Local-First Storage Architecture
 */

export const MAVERICK_SQLITE_SCHEMA = `
-- PRAGMA configuration for high performance and integrity
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 1. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'dark',
  default_answer_mode TEXT NOT NULL DEFAULT 'senior',
  selected_mic_id TEXT DEFAULT 'default',
  system_audio_enabled INTEGER NOT NULL DEFAULT 1,
  screen_share_privacy_enabled INTEGER NOT NULL DEFAULT 1,
  floating_opacity REAL NOT NULL DEFAULT 0.95,
  telemetry_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Model Settings Table
CREATE TABLE IF NOT EXISTS model_settings (
  id TEXT PRIMARY KEY,
  ollama_endpoint TEXT NOT NULL DEFAULT 'http://localhost:11434',
  primary_model TEXT NOT NULL DEFAULT 'qwen3:8b-q4_K_M',
  context_length INTEGER NOT NULL DEFAULT 8192,
  temperature REAL NOT NULL DEFAULT 0.35,
  max_output_tokens INTEGER NOT NULL DEFAULT 1024,
  whisper_model TEXT NOT NULL DEFAULT 'tiny.en',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Interview Sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  action_items_json TEXT,
  key_topics_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON interview_sessions(created_at DESC);

-- 4. Transcript Segments (Dual-Channel: Interviewer vs Candidate)
CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('interviewer', 'candidate')),
  text TEXT NOT NULL,
  timestamp_offset TEXT NOT NULL,
  confidence REAL DEFAULT 0.95,
  is_question INTEGER NOT NULL DEFAULT 0,
  detected_topics_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_segments_session ON transcript_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_segments_is_q ON transcript_segments(is_question);

-- 5. AI Responses
CREATE TABLE IF NOT EXISTS ai_responses (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES interview_sessions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  mode TEXT NOT NULL,
  category TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  token_count INTEGER,
  grounded_sources_json TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_responses_session ON ai_responses(session_id);

-- 6. Resumes and Profiles
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  target_role TEXT NOT NULL,
  years_experience INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  skills_json TEXT NOT NULL,
  experience_json TEXT NOT NULL,
  projects_json TEXT NOT NULL,
  raw_text TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Job Descriptions
CREATE TABLE IF NOT EXISTS job_descriptions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  requirements_json TEXT NOT NULL,
  match_score REAL DEFAULT 0.0,
  matched_skills_json TEXT,
  missing_skills_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Knowledge Documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  chunks_count INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  summary TEXT,
  last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Document Chunks & Vector Store
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_vector BLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(doc_id);

-- 10. Mock Interviews & Evaluations
CREATE TABLE IF NOT EXISTS mock_interviews (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  track TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  overall_score REAL,
  feedback_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id TEXT PRIMARY KEY,
  mock_id TEXT NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  expected_points_json TEXT,
  user_answer TEXT,
  technical_score REAL,
  problem_solving_score REAL,
  communication_score REAL,
  confidence_score REAL,
  model_answer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
