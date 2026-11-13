# Mock Interview Module — Integration Guide

A self-contained, modular technical interview round simulator for DevOps & Cloud engineering roles.

## Architecture & Interfaces

```
src/features/mock-interview/
├── components/
│   ├── TopicSelector.tsx        # Track + Seniority + 10 Tool selection & session config
│   ├── PreCheckModal.tsx        # Privacy consent + Camera, Mic, Lighting & Posture check
│   ├── InterviewSession.tsx     # Timed simulation with TTS, Voice-to-Text & Posture overlay
│   └── ResultsView.tsx          # 5-axis SVG Radar Chart, Topic Breakdown & Posture Timeline
├── hooks/
│   └── useSpeechToText.ts       # Web Speech Recognition, WPM pace meter & filler counter
├── services/
│   ├── evaluatorClient.ts       # Configurable external AI evaluator adapter + fallback rubric
│   ├── postureTracker.ts        # Live canvas skeleton lines (green/yellow/red) & correction hints
│   └── questionBank.ts          # Gemini question generation client + seeded fallback bank
└── types.ts                     # Strict TypeScript interfaces
```

## Server-Side & Persistence Integration

- **Gemini Question Generation**: `POST /api/mock-interview/questions/generate` generates non-repeating JSON-schema questions strictly constrained to selected topics, avoiding prior question hashes and similar phrasing stored in `user_question_history`. Falls back gracefully to the seeded question bank when offline.
- **Cloud Firestore Collections**:
  - `interview_attempts`: Full attempt transcripts, category scores, posture timelines, and pass/fail flags.
  - `user_question_history`: Per-user normalized question hashes preventing repeats across attempts.
  - `user_interview_status`: Monotonic completion status per user and topic set (`Completed` is never revoked by future lower scores).
  - `interview_settings`: Admin-configurable pass threshold (default `80%`), dimension weights, and session defaults.

## 5 Assessment Dimensions Evaluated
1. **Answer Quality (default 35%)**: Technical accuracy, coverage of expected architectural key points.
2. **Body Posture (default 20%)**: Spine alignment, level shoulders, steady eye direction.
3. **Communication Skills (default 20%)**: Speaking pace (120–160 WPM ideal), minimal filler words.
4. **Word Formation (default 15%)**: Grammar, cloud/DevOps vocabulary density, structured delivery.
5. **Way of Talking (default 10%)**: Confidence, pause control, and cadence.

## Pass & Completion Rule
- **Threshold**: Overall composite score **≥ 80%** (configurable in Admin Settings).
- When score meets or exceeds threshold, attempt is marked **PASSED** and status becomes **Completed**.
- Once marked **Completed**, subsequent attempts with lower scores preserve `Completed` status.
