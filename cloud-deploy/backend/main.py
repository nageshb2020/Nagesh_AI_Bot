import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings
from services.profile_service import ProfileService
from services.embed_service import EmbedService
from services.chat_service import ChatService
from services.rag_service import RAGService
import services.resume_parser as resume_parser


profile_service = ProfileService()
embed_service = EmbedService()
chat_service = ChatService()
rag_service = RAGService(embed_service, chat_service, profile_service)

_ALLOWED_EXTS = {".pdf", ".docx"}


def require_admin(x_admin_token: str = Header(default="", alias="X-Admin-Token")) -> None:
    if not settings.admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token")


def _find_resume() -> Path | None:
    for ext in _ALLOWED_EXTS:
        f = Path(settings.data_dir) / f"resume{ext}"
        if f.exists():
            return f
    return None


def _load_chunks() -> tuple[list[dict], str]:
    resume = _find_resume()
    if resume:
        print(f"[Startup] Resume found: {resume.name}")
        return resume_parser.parse(str(resume)), resume.name
    print("[Startup] No resume — using profile.json")
    return profile_service.get_chunks(), "profile.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    profile_service.load()
    chunks, source = _load_chunks()
    print(f"[Startup] Indexing {len(chunks)} chunks from '{source}'...")
    embed_service.index(chunks)
    print(f"[Startup] Ready — {embed_service.count} chunks indexed via {settings.chat_provider.upper()}.")
    yield


app = FastAPI(
    title="Personal AI Recruiter Bot",
    description="RAG-powered recruiter assistant — works with Ollama (local) or Groq (cloud)",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.get("/health")
async def health():
    ok = await chat_service.health_check()
    return {
        "status": "ok",
        "chat_provider": settings.chat_provider,
        "provider_status": "connected" if ok else "unavailable",
        "chunks_indexed": embed_service.count,
    }


@app.get("/status")
async def status():
    resume = _find_resume()
    return {
        "mode": "resume" if resume else "profile_json",
        "source_file": resume.name if resume else "profile.json",
        "chunks_indexed": embed_service.count,
    }


@app.get("/profile")
async def get_profile():
    p = profile_service.get_profile()
    if not p:
        raise HTTPException(503, "Profile not loaded")
    return p


@app.post("/upload/resume", dependencies=[Depends(require_admin)])
async def upload_resume(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported type. Upload a PDF or DOCX.")

    data_dir = Path(settings.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    for ext in _ALLOWED_EXTS:
        old = data_dir / f"resume{ext}"
        if old.exists():
            old.unlink()

    dest = data_dir / f"resume{suffix}"
    dest.write_bytes(await file.read())

    try:
        chunks = resume_parser.parse(str(dest))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(422, f"Parse failed: {e}")

    embed_service.reset()
    embed_service.index(chunks)
    return {"status": "indexed", "filename": file.filename, "chunks": len(chunks)}


@app.delete("/upload/resume", dependencies=[Depends(require_admin)])
async def delete_resume():
    for ext in _ALLOWED_EXTS:
        f = Path(settings.data_dir) / f"resume{ext}"
        if f.exists():
            f.unlink()
    embed_service.reset()
    chunks = profile_service.get_chunks()
    embed_service.index(chunks)
    return {"status": "reverted_to_profile_json", "chunks": len(chunks)}


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    async def stream():
        try:
            async for token in rag_service.stream(request.message, request.history):
                yield f"data: {json.dumps({'content': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
