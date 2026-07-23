# C4 Architecture Diagrams — Personal AI Recruiter Bot

> Designed using the C4 Model (Simon Brown) — four levels of progressive detail.

---

## Level 1 — System Context

> Who uses the system and what external systems does it touch?

```mermaid
C4Context
    title System Context — Personal AI Recruiter Bot

    Person(recruiter, "Recruiter / HR Manager", "Talent acquisition professional evaluating candidates for a role")
    Person(candidate, "Nagesh Bellary", "The candidate. Owns, configures, and deploys the bot to represent himself")

    System(bot, "Personal AI Recruiter Bot", "AI-powered conversational interface that represents the candidate's profile, skills, experience, and career goals to recruiters via natural language chat")

    System_Ext(ollama, "Ollama Runtime", "Locally hosted open-source LLM service. Runs llama3.2 for chat and nomic-embed-text for vector embeddings. No cloud API calls — 100% private")

    Rel(recruiter, bot, "Visits URL, asks questions in chat", "HTTPS / Browser")
    Rel(candidate, bot, "Configures profile JSON, deploys via Docker", "CLI / Docker Compose")
    Rel(bot, ollama, "Sends prompts, receives streamed token responses and embeddings", "HTTP REST (localhost)")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

## Level 2 — Container Diagram

> What deployable units make up the system?

```mermaid
C4Container
    title Container Diagram — Personal AI Recruiter Bot

    Person(recruiter, "Recruiter", "Hiring professional")

    System_Boundary(system, "Personal AI Recruiter Bot — Docker Network") {

        Container(frontend, "Web Frontend", "React 18 · Vite · TailwindCSS", "Single-page application. Profile sidebar + streaming chat interface. Served via Nginx.")

        Container(backend, "API Backend", "Python 3.11 · FastAPI · Uvicorn", "REST API server. Orchestrates the RAG pipeline: embed query → retrieve context → augment prompt → stream response via SSE.")

        ContainerDb(vectordb, "Vector Store", "ChromaDB (persistent)", "Stores 768-dim embeddings of chunked profile sections. Enables semantic similarity search at query time.")

        ContainerDb(profilestore, "Profile Store", "JSON flat-file", "Structured candidate profile: personal info, work experience, projects, skills, certifications, achievements.")
    }

    System_Ext(ollama, "Ollama Server", "Docker container — ollama/ollama:latest\nModels: llama3.2 (chat) · nomic-embed-text (embeddings)")

    Rel(recruiter, frontend, "Opens browser, types questions", "HTTPS :3000")
    Rel(frontend, backend, "POST /chat/stream — sends message + history", "HTTP SSE :8000")
    Rel(frontend, backend, "GET /profile — fetch profile for sidebar", "HTTP JSON :8000")
    Rel(backend, vectordb, "Query top-K similar chunks by cosine distance", "Python SDK")
    Rel(backend, profilestore, "Read and chunk profile on startup", "File I/O")
    Rel(backend, ollama, "POST /api/embeddings — encode query and profile chunks", "HTTP :11434")
    Rel(backend, ollama, "POST /api/chat — stream chat completion tokens", "HTTP :11434")
```

---

## Level 3 — Component Diagram (API Backend)

> What are the internal building blocks of the backend?

```mermaid
C4Component
    title Component Diagram — API Backend (FastAPI)

    Container_Ext(frontend, "Web Frontend", "React SPA", "Sends chat messages and history, displays streamed response")
    ContainerDb_Ext(vectordb, "ChromaDB", "Vector Store", "Persists and retrieves profile embeddings")
    System_Ext(ollama, "Ollama", "LLM Runtime", "Chat completions + text embeddings")

    Container_Boundary(backend, "API Backend") {

        Component(router, "API Router", "FastAPI · uvicorn", "Exposes HTTP endpoints:\n  GET  /health\n  GET  /profile\n  POST /chat/stream (SSE)")

        Component(rag, "RAG Service", "Python class · Orchestrator", "Core pipeline:\n1. Receive query + history\n2. Retrieve context chunks\n3. Build augmented prompt\n4. Stream LLM response")

        Component(prompt, "Prompt Builder", "Python module", "Injects retrieved context into\na persona-locked system prompt.\nConstrains hallucination to\nprofile facts only.")

        Component(embed, "Embedding Service", "Python class · ChromaDB client", "On startup: chunks profile → embeds\nvia Ollama → persists to ChromaDB.\nAt query time: embed query → ANN\nsearch → return top-K docs.")

        Component(ollama_svc, "Ollama Service", "Python class · httpx async client", "Thin async client:\n• embed(text) → float[]\n• stream_chat(messages) → AsyncIterator[str]")

        Component(profile_svc, "Profile Service", "Python class", "Reads profile.json → validates →\nchunks into semantic segments\n(summary, each role, skills,\nprojects, education/certs).")
    }

    Rel(frontend, router, "POST /chat/stream", "HTTP / SSE")
    Rel(router, rag, "rag.stream(query, history)")
    Rel(rag, embed, "embed.retrieve(query, n=4)")
    Rel(rag, prompt, "prompt.build(context, history)")
    Rel(rag, ollama_svc, "ollama.stream_chat(messages)")
    Rel(embed, vectordb, "collection.query(embedding, n_results)")
    Rel(embed, ollama_svc, "ollama.embed(text)")
    Rel(profile_svc, embed, "embed.index(chunks) on startup")
```

---

## Level 4 — Code Diagram (RAG Pipeline Class Design)

> Key class relationships inside the RAG service.

```mermaid
classDiagram
    class RAGService {
        -EmbeddingService embedding_svc
        -OllamaService ollama_svc
        -str candidate_name
        +stream(query, history) AsyncIterator~str~
        -_build_messages(context, query, history) list~dict~
    }

    class EmbeddingService {
        -chromadb.Collection collection
        -OllamaService ollama_svc
        +index(chunks) Coroutine
        +retrieve(query, n) Coroutine~list~str~~
        -_already_indexed() bool
    }

    class OllamaService {
        -str base_url
        -str chat_model
        -str embed_model
        +embed(text) Coroutine~list~float~~
        +stream_chat(messages) AsyncIterator~str~
    }

    class ProfileService {
        -dict _profile
        +load() None
        +get_profile() dict
        +get_chunks() list~dict~
        -_chunk_experience(exp) dict
        -_chunk_skills(skills) dict
    }

    RAGService --> EmbeddingService : retrieves context
    RAGService --> OllamaService : streams completion
    EmbeddingService --> OllamaService : generates embeddings
    ProfileService --> EmbeddingService : indexes chunks on startup
```

---

## Deployment Architecture

> How does the system run end-to-end on a single host?

```mermaid
graph TB
    subgraph HOST["🖥️ Host Machine (Linux / Mac / Windows)"]
        subgraph DOCKER["Docker Network: recruiter-bot-net"]
            FE["🌐 Frontend\nnginx:alpine\nport 3000:80\nServes React SPA\nProxies /api → backend"]
            BE["⚙️ Backend\npython:3.11-slim\nport 8000:8000\nFastAPI + Uvicorn"]
            OL["🦙 Ollama\nollama/ollama:latest\nport 11434:11434\nllama3.2 + nomic-embed-text"]
        end

        subgraph VOLUMES["Named Volumes"]
            V1[("ollama_data\n~/.ollama models")]
            V2[("chroma_data\n/app/chroma_db")]
        end
    end

    BROWSER["🔍 Recruiter's Browser"] -->|"HTTP :3000"| FE
    FE -->|"HTTP /api → :8000"| BE
    BE -->|"HTTP :11434"| OL
    OL --> V1
    BE --> V2

    style HOST fill:#0f172a,stroke:#334155,color:#e2e8f0
    style DOCKER fill:#1e293b,stroke:#475569,color:#e2e8f0
    style VOLUMES fill:#1e293b,stroke:#475569,color:#e2e8f0
```

---

## RAG Data Flow

> Step-by-step flow of a single recruiter query.

```mermaid
sequenceDiagram
    actor R as Recruiter
    participant FE as Frontend (React)
    participant BE as Backend (FastAPI)
    participant CB as ChromaDB
    participant OL as Ollama

    Note over R,OL: Startup — profile indexing (runs once)
    BE->>BE: Load profile.json → chunk into segments
    loop For each chunk
        BE->>OL: POST /api/embeddings {text: chunk}
        OL-->>BE: float[768]
    end
    BE->>CB: collection.add(docs, embeddings, ids)

    Note over R,OL: Query time — recruiter asks a question
    R->>FE: "What AI products has Nagesh shipped?"
    FE->>BE: POST /chat/stream {message, history}

    BE->>OL: POST /api/embeddings {text: query}
    OL-->>BE: query_embedding float[768]

    BE->>CB: collection.query(query_embedding, n=4)
    CB-->>BE: top-4 relevant profile chunks

    BE->>BE: Build prompt:\n[system: persona + context]\n[history]\n[user: query]

    BE->>OL: POST /api/chat {messages, stream:true}
    loop Stream tokens
        OL-->>BE: {"message":{"content":"token"}}
        BE-->>FE: data: {"content":"token"}\n\n
        FE-->>R: Render token in chat bubble
    end
    BE-->>FE: data: [DONE]
```
