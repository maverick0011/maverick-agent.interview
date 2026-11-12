# Maverick AI local backend

This service runs on the user's Mac only. It binds to `127.0.0.1`, never `0.0.0.0`, and proxies a small allowlist of Ollama API routes.

## Requirements

- macOS or another supported Node.js host
- Node.js 20+ or Bun
- Ollama installed and running locally
- Qwen3 8B model installed in Ollama

## Start

From the repository root:

```bash
bun install
ollama serve
ollama pull qwen3:8b
bun run backend:dev
```

For a non-watch process use `bun run backend:start`.

The health endpoint is `http://127.0.0.1:3001/api/health`. The frontend's default Ollama endpoint is `http://127.0.0.1:3001/ollama`.

## Browser origins

The backend permits the repository's GitHub Pages origin, the custom domain configured in `public/CNAME`, and localhost Vite development origins. Add further origins through `MAVERICK_ALLOWED_ORIGINS` in the local shell environment.

The backend only exposes selected read and inference routes. It does not expose Ollama's model deletion, filesystem, or administrative endpoints.

## Privacy and limitations

- AI inference and Ollama model storage remain on the Mac.
- The static UI is public. Do not put secrets, resume files, transcripts, or private data in the frontend build or GitHub repository.
- Browser storage remains in the browser profile; this PR does not migrate existing localStorage records into a server-side SQLite database.
- A visitor opening the public site on another computer will connect only to that visitor's own loopback address, not this Mac.
- Native macOS system-audio capture and Electron-only features still require the desktop application. GitHub Pages does not host Electron or a Mac backend.
- CORS is an origin boundary, not user authentication. Keep this server bound to loopback and do not expose it with a public tunnel.
