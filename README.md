# Maverick AI

Maverick AI is a local-first AI interview assistant. The public frontend is deployed to GitHub Pages; AI inference is intended to run on the user's own Mac through a loopback-only Node.js backend and Ollama.

## Frontend (GitHub Pages)

The Vite app builds to `dist/`. Relative asset paths are configured for GitHub Pages and Electron builds. The existing custom domain is retained in `public/CNAME`.

## Local AI backend

See [backend/README.md](backend/README.md).

Quick start from the repository root:

```bash
bun install
ollama serve
ollama pull qwen3:8b
bun run backend:dev
```

Then open the GitHub Pages site. The frontend uses `http://127.0.0.1:3001/ollama` as its Ollama-compatible endpoint by default.

## Development

```bash
bun install --frozen-lockfile
bun run dev
bun run lint
bun run build
```

In a second terminal, run `bun run backend:dev` for local AI access.

## Deployment

Pull requests to `main` run type-check and Vite build validation. A push to `main` deploys the static `dist/` directory to GitHub Pages. The `dev` branch is not deployed automatically.

## Architecture boundaries

- GitHub Pages hosts only static frontend assets.
- Node.js backend binds to `127.0.0.1:3001`.
- Ollama remains at `127.0.0.1:11434` and is reachable through the local backend proxy.
- Browser-based visitors use their own computer's loopback backend.
- Electron/native macOS capture capabilities remain desktop-only.
