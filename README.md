# Personal AI Recruiter Bot

> An AI-powered personal recruiter chatbot using **RAG architecture**, **Ollama** (local LLM), **ChromaDB**, **FastAPI**, and **React** — fully containerised with Docker Compose.

---

## Architecture

This system uses a **Retrieval-Augmented Generation (RAG)** pipeline to ground LLM responses in actual profile data, eliminating hallucination and ensuring every answer is traceable to real facts.

```
Recruiter Query
       │
       ▼
 [React Frontend] ──SSE──▶ [FastAPI Backend]
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
             [ChromaDB]                     [Ollama]
          (vector similarity)          (llama3.2 chat +
          retrieve top-4 chunks        nomic-embed-text)
                    │
                    └──── augment prompt ──── stream response
```

See [`architecture/c4-diagrams.md`](architecture/c4-diagrams.md) for full **C4 diagrams** (Context → Container → Component → Code level).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM Runtime** | [Ollama](https://ollama.ai) — 100% local, zero cloud costs, privacy-first |
| **Chat Model** | `llama3.2` (3B, fast, accurate) |
| **Embed Model** | `nomic-embed-text` (768-dim, MTEB SOTA) |
| **Vector Store** | ChromaDB (persistent, cosine similarity, ANN search) |
| **Backend** | FastAPI + Uvicorn (async, SSE streaming) |
| **Frontend** | React 18 + Vite + TailwindCSS |
| **Deployment** | Docker Compose (3 services, 2 volumes) |

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- 4GB+ free disk space (for models)
- 8GB+ RAM recommended

### 1. Start the services

```bash
docker compose up -d
```

### 2. Pull the AI models (first run only)

```powershell
# Windows
.\scripts\init-models.ps1

# Mac / Linux
docker exec recruiter-bot-ollama ollama pull llama3.2
docker exec recruiter-bot-ollama ollama pull nomic-embed-text
```

### 3. Open the bot

```
http://localhost:3000
```

The backend will automatically index the profile on first startup (~30 seconds).

---

## Customising Your Profile

Edit [`backend/data/profile.json`](backend/data/profile.json) with your own details:

```json
{
  "personal": { "name": "Your Name", "title": "Your Title", ... },
  "experience": [...],
  "skills": { "ai_ml": [...], "technical": [...] },
  "projects": [...],
  "certifications": [...]
}
```

After editing, reset the ChromaDB index so it re-embeds your updated profile:

```bash
docker compose restart backend
docker volume rm personal-recruiter-bot_chroma_data
docker compose up -d
```

---

## Project Structure

```
Personal-Recruiter-Bot/
├── architecture/
│   └── c4-diagrams.md          # C4 diagrams (all 4 levels + sequence diagram)
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment-driven configuration
│   ├── services/
│   │   ├── ollama_service.py   # Async Ollama client (embed + stream chat)
│   │   ├── embedding_service.py # ChromaDB indexing and retrieval
│   │   ├── profile_service.py  # Profile JSON loader and chunker
│   │   └── rag_service.py      # RAG orchestrator + prompt builder
│   ├── data/profile.json       # Your candidate profile
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Root layout (sidebar + chat)
│   │   └── components/
│   │       ├── ChatInterface.jsx    # SSE streaming chat
│   │       ├── ProfileCard.jsx      # Candidate profile sidebar
│   │       ├── MessageBubble.jsx    # Chat message rendering
│   │       ├── SuggestedQuestions.jsx
│   │       └── TypingIndicator.jsx
│   ├── nginx.conf              # Reverse-proxy /api → backend + SSE config
│   └── Dockerfile
├── scripts/
│   └── init-models.ps1         # Pull Ollama models
├── docker-compose.yml
└── .env.example
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | — | System health — Ollama status, chunks indexed |
| `GET` | `/profile` | — | Full profile JSON |
| `POST` | `/chat/stream` | — | SSE streaming chat (`{message, history[], session_id}`). Emits `{"type":"sources",...}` then `{"type":"token",...}` events |
| `GET` | `/status` | — | Resume mode (`resume` \| `profile_json`) |
| `GET` | `/resume/download` | — | Downloads the currently active resume file |
| `GET` | `/video/status` | — | `{exists, filename}` for the intro video |
| `GET` | `/video` | — | Streams the intro video (supports HTTP Range) |
| `POST` | `/leads` | — | Submit a lead (`{name, email, company, message, session_id}`) |
| `POST`/`DELETE` | `/upload/resume` | Admin | Upload/remove the resume (re-indexes RAG) |
| `POST`/`DELETE` | `/upload/video` | Admin | Upload/remove the intro video |
| `GET` | `/admin/analytics` | Admin | Leads, recent questions, totals |

Admin-only endpoints require an `X-Admin-Token` header matching the `ADMIN_TOKEN` env var. Manage everything (resume, video, leads, analytics) from the `/admin` page on the frontend.

---

## Why This Architecture?

| Decision | Reason |
|----------|--------|
| **Ollama** (not cloud API) | Zero cost, full privacy — recruiter conversations never leave your machine |
| **RAG** (not fine-tuning) | Profile updates in seconds by editing JSON — no retraining |
| **ChromaDB** (not in-memory) | Embeddings persist across restarts — no re-indexing on every startup |
| **SSE** (not WebSocket) | Simpler protocol for unidirectional streaming, compatible with all proxies |
| **Docker Compose** | Single-command deployment, reproducible across any host |

---

## LinkedIn Showcase Points

- **RAG Architecture** — demonstrates production GenAI pattern knowledge
- **Local LLM Deployment** — Ollama orchestration, model management
- **Vector Embeddings** — ChromaDB, cosine similarity, ANN search
- **Async Streaming** — FastAPI + SSE for real-time UX
- **C4 Diagramming** — senior architect communication skill
- **Full-stack** — React, FastAPI, Docker — end-to-end ownership
