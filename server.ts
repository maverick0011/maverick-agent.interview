import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.MAVERICK_PORT || 3000);
const HOST = '0.0.0.0';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const EVALUATOR_ENDPOINT = process.env.EVALUATOR_ENDPOINT || '';

app.disable('x-powered-by');
app.use(express.json({ limit: '4mb', strict: true }));

// --- Server-Side Helpers for Mock Interview API ---
function normalizeQuestionText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function hashQuestion(text: string): string {
  const norm = normalizeQuestionText(text);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    const char = norm.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `qhash_${Math.abs(hash).toString(36)}`;
}

function isTooSimilar(a: string, b: string): boolean {
  const wordsA = new Set(normalizeQuestionText(a).split(' ').filter(w => w.length > 3));
  const wordsB = new Set(normalizeQuestionText(b).split(' ').filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const jaccard = overlap / (wordsA.size + wordsB.size - overlap);
  return jaccard >= 0.65;
}

interface StoredAttempt {
  id: string;
  userId: string;
  topics: string[];
  startedAt: string;
  endedAt?: string;
  answers: unknown[];
  overallScore: number;
  categoryScores: Record<string, number>;
  passed: boolean;
  status: string;
}

const memoryAttempts = new Map<string, StoredAttempt>();
const memoryQuestionHistory = new Map<string, Set<string>>();
let memorySettings = {
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
};

// --- Health Route ---
app.get('/api/health', async (_req: Request, res: Response) => {
  let ollama = false;
  try {
    const response = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(1000) });
    ollama = response.ok;
  } catch {
    // Local Ollama optional in cloud runtime
  }
  res.json({
    status: 'online',
    service: 'Maverick AI server',
    ollama: ollama ? 'online' : 'offline',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// --- Server-Side Gemini Question Generation (Strict JSON Schema + No-Repeat Check) ---
app.post('/api/mock-interview/questions/generate', async (req: Request, res: Response) => {
  const {
    userId = 'anonymous',
    selectedTopics = ['Linux', 'Docker', 'Kubernetes'],
    difficulty = 'senior',
    count = 10,
    excludeQuestions = [],
    excludeHashes = [],
  } = req.body || {};

  const topics: string[] = Array.isArray(selectedTopics) && selectedTopics.length > 0
    ? selectedTopics
    : ['Linux', 'Docker', 'Kubernetes'];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      questions: [],
      fallback: true,
      reason: 'GEMINI_API_KEY not configured; using seeded local question bank.',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const userHistory = memoryQuestionHistory.get(String(userId)) || new Set<string>();
    const combinedHashes = new Set<string>([
      ...userHistory,
      ...(Array.isArray(excludeHashes) ? excludeHashes.map(String) : []),
    ]);
    const priorTexts: string[] = Array.isArray(excludeQuestions) ? excludeQuestions.map(String).slice(0, 40) : [];

    const prompt = `Generate exactly ${Math.min(20, Math.max(1, Number(count)))} unique technical DevOps/Cloud interview questions.

STRICT CONSTRAINTS:
1. Select topics EXCLUSIVELY from: ${topics.join(', ')}. Never ask about any topic outside this list.
2. Spread questions as evenly as possible across the selected topics.
3. Difficulty level: ${difficulty}.
4. Mix question types realistically across: "conceptual", "scenario", "troubleshooting", "hands-on".
5. Vary sub-areas on every attempt (e.g. Kubernetes -> networking, RBAC, HPA, StatefulSets, probes; AWS -> IAM, VPC, EKS, S3, autoscaling; Karpenter -> NodePools, consolidation, disruption budgets).
6. DO NOT repeat or closely paraphrase any of these previously asked questions:
${priorTexts.length > 0 ? priorTexts.map((q, idx) => `- ${idx + 1}. ${q}`).join('\n') : '- None yet'}
7. Include 3 to 5 concrete expectedKeyPoints and an optional practical followUp question for each.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: 'You are a Staff SRE & Cloud Architecture interviewer generating non-repeating technical interview questions in strict JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              topic: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              type: { type: Type.STRING },
              question: { type: Type.STRING },
              expectedKeyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              followUp: { type: Type.STRING },
            },
            required: ['id', 'topic', 'difficulty', 'type', 'question', 'expectedKeyPoints'],
          },
        },
      },
    });

    const rawText = (response.text ?? '[]').trim();
    const parsed = JSON.parse(rawText);
    const validTypes = new Set(['conceptual', 'scenario', 'troubleshooting', 'hands-on']);
    const allowedTopics = new Set(topics.map(t => t.toLowerCase()));

    const uniqueQuestions = [];
    for (let i = 0; i < (Array.isArray(parsed) ? parsed.length : 0); i++) {
      const item = parsed[i];
      if (!item || typeof item.question !== 'string') continue;
      const matchedTopic = topics.find(t => t.toLowerCase() === String(item.topic || '').toLowerCase())
        || topics[i % topics.length];
      if (!allowedTopics.has(matchedTopic.toLowerCase())) continue;

      const qHash = hashQuestion(item.question);
      const duplicateText = priorTexts.some(prev => isTooSimilar(prev, item.question));
      if (combinedHashes.has(qHash) || duplicateText) continue;

      combinedHashes.add(qHash);
      priorTexts.push(item.question);

      uniqueQuestions.push({
        id: `gem-${Date.now()}-${i}`,
        topic: matchedTopic,
        difficulty: String(difficulty),
        type: validTypes.has(item.type) ? item.type : 'scenario',
        question: item.question,
        expectedKeyPoints: Array.isArray(item.expectedKeyPoints) ? item.expectedKeyPoints.slice(0, 6) : [],
        followUp: typeof item.followUp === 'string' && item.followUp.trim() ? item.followUp.trim() : undefined,
        hash: qHash,
      });
    }

    memoryQuestionHistory.set(String(userId), combinedHashes);

    return res.json({
      questions: uniqueQuestions,
      source: 'gemini',
      fallback: uniqueQuestions.length === 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini question generation failed';
    return res.status(200).json({
      questions: [],
      fallback: true,
      reason: message,
    });
  }
});

// --- External Evaluator Proxy (Optional if EVALUATOR_ENDPOINT is configured) ---
app.post('/api/mock-interview/evaluate', async (req: Request, res: Response) => {
  const endpoint = req.body?.endpoint || EVALUATOR_ENDPOINT;
  if (!endpoint || typeof endpoint !== 'string' || endpoint.includes('localhost:8000') && !EVALUATOR_ENDPOINT) {
    return res.status(503).json({
      error: 'External AI evaluator service is not reachable in this environment.',
      reachable: false,
    });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body.payload ?? req.body),
      signal: AbortSignal.timeout(6000),
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Evaluator responded with ${upstream.status}` });
    }
    const data = await upstream.json();
    return res.json(data);
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Evaluator unreachable',
      reachable: false,
    });
  }
});

// --- Suggested Mock Interview REST API Endpoints ---
app.post('/api/mock-interview/attempts', (req: Request, res: Response) => {
  const { userId = 'anonymous', topics = [], questions = [] } = req.body || {};
  const id = `attempt-${Date.now()}`;
  const attempt: StoredAttempt = {
    id,
    userId: String(userId),
    topics: Array.isArray(topics) ? topics : [],
    startedAt: new Date().toISOString(),
    answers: [],
    overallScore: 0,
    categoryScores: { answerQuality: 0, communication: 0, wordFormation: 0, speakingStyle: 0, posture: 0 },
    passed: false,
    status: 'in_progress',
  };
  memoryAttempts.set(id, attempt);
  res.status(201).json({ attempt, questions });
});

app.post('/api/mock-interview/attempts/:id/answers', (req: Request, res: Response) => {
  const attempt = memoryAttempts.get(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  attempt.answers.push(req.body);
  res.json({ ok: true, count: attempt.answers.length });
});

app.post('/api/mock-interview/attempts/:id/complete', (req: Request, res: Response) => {
  const attempt = memoryAttempts.get(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  const overallScore = Number(req.body?.overallScore ?? 0);
  attempt.endedAt = new Date().toISOString();
  attempt.overallScore = overallScore;
  attempt.categoryScores = req.body?.categoryScores ?? attempt.categoryScores;
  attempt.passed = overallScore >= memorySettings.passThreshold;
  attempt.status = 'completed';
  res.json({ attempt });
});

app.get('/api/mock-interview/me/history', (req: Request, res: Response) => {
  const userId = String(req.query.userId || '');
  const list = Array.from(memoryAttempts.values()).filter(a => !userId || a.userId === userId);
  res.json({ attempts: list });
});

app.get('/api/admin/mock-interview/users', (_req: Request, res: Response) => {
  res.json({ attempts: Array.from(memoryAttempts.values()) });
});

app.get('/api/admin/mock-interview/users/:userId', (req: Request, res: Response) => {
  const list = Array.from(memoryAttempts.values()).filter(a => a.userId === req.params.userId);
  res.json({ userId: req.params.userId, attempts: list });
});

app.put('/api/admin/mock-interview/settings', (req: Request, res: Response) => {
  memorySettings = { ...memorySettings, ...req.body };
  res.json({ settings: memorySettings });
});

// --- Local Ollama Proxy (Loopback compatibility) ---
const allowedOllamaRoutes = new Set([
  'GET /api/version',
  'GET /api/tags',
  'GET /api/ps',
  'POST /api/chat',
  'POST /api/generate',
  'POST /api/pull',
  'POST /api/embed',
  'POST /api/embeddings',
  'POST /api/show',
]);

app.use('/ollama', async (req: Request, res: Response) => {
  const route = `${req.method} ${req.path}`;
  if (!allowedOllamaRoutes.has(route)) {
    return res.status(404).json({ error: 'Ollama endpoint is not exposed by this proxy' });
  }

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const upstream = await fetch(`${OLLAMA_URL}${req.path}`, {
      method: req.method,
      headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined,
      signal: controller.signal,
    });
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    if (!upstream.body) return res.end();
    for await (const chunk of upstream.body) {
      if (res.destroyed) break;
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    res.status(502).json({
      error: 'Local Ollama runtime unreachable.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// --- Vite Middleware (Dev) or Static Dist Serving (Production) ---
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Maverick AI server listening on http://${HOST}:${PORT}`);
  });
}

startServer();
