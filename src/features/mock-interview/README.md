# Mock Interview Module — Integration Guide

A self-contained, modular technical interview round simulator for DevOps & Cloud engineering roles.

## Architecture & Interfaces

```
src/features/mock-interview/
├── components/
│   ├── TopicSelector.tsx        # Track + Seniority + 10 Tool selection & session config
│   ├── PreCheckModal.tsx        # Camera, Mic, Lighting, and Skeleton framing pre-check
│   ├── InterviewSession.tsx     # Timed simulation with TTS, Voice-to-Text & Posture overlay
│   └── ResultsView.tsx          # 5-dimension assessment rubric with 80% Pass gate
├── hooks/
│   └── useSpeechToText.ts       # Web Speech Recognition, WPM pace meter & filler counter
├── services/
│   ├── evaluatorClient.ts       # External evaluator client adapter (POST to localhost / cloud)
│   ├── postureTracker.ts        # Live canvas skeleton lines (green/yellow/red) & correction hints
│   └── questionBank.ts          # 30+ questions per tool with user hash exclusion (no repeats)
└── types.ts                     # Strict TypeScript interfaces
```

## 5 Assessment Dimensions Evaluated
1. **Answer Quality (35% weight)**: Technical depth, expected architectural key points coverage.
2. **Body Posture (20% weight)**: Spine alignment, level shoulders, steady eye direction.
3. **Communication Skills (20% weight)**: Speaking pace (120-160 WPM ideal), minimal filler words (`um`, `like`, `basically`).
4. **Word Formation (15% weight)**: Grammar, cloud/DevOps vocabulary density, structured sentence delivery.
5. **Way of Talking (10% weight)**: Confidence, pause control, and cadence.

## Pass & Completion Rule
- **Threshold**: Overall composite score **&ge; 80%**.
- When score is 80%+, attempt is marked **PASSED** and candidate status becomes **COMPLETED**.
- If score is < 80%, status is marked **RETRY REQUIRED**.
- **Idempotent Completion**: Once marked **COMPLETED**, a future lower score will never revoke the completed status.

## Dropping into Host App

```tsx
import { MockInterviewPage } from './pages/MockInterviewPage';

// In your router or tab switcher:
<MockInterviewPage />
```
