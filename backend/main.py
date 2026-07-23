import json
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from config import settings
from services.profile_service import ProfileService
from services.embedding_service import EmbeddingService
from services.rag_service import RAGService
from services.ollama_service import OllamaService
from services.leads_service import LeadsService
import services.resume_parser as resume_parser


profile_service = ProfileService()
embedding_service = EmbeddingService()
rag_service = RAGService(embedding_service, profile_service)
ollama_service = OllamaService()
leads_service = LeadsService()

_ALLOWED_RESUME_EXTS = {".pdf", ".docx"}
_ALLOWED_VIDEO_EXTS = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}


def require_admin(x_admin_token: str = Header(default="", alias="X-Admin-Token")) -> None:
    if not settings.admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token")


def _find_resume_file() -> Path | None:
    data_dir = Path(settings.data_dir)
    for ext in _ALLOWED_RESUME_EXTS:
        candidate = data_dir / f"resume{ext}"
        if candidate.exists():
            return candidate
    return None


def _find_video_file() -> Path | None:
    data_dir = Path(settings.data_dir)
    for ext in _ALLOWED_VIDEO_EXTS:
        candidate = data_dir / f"intro_video{ext}"
        if candidate.exists():
            return candidate
    return None


def _get_chunks() -> tuple[list[dict], str]:
    """Return (chunks, source_label). Prefers resume over profile.json."""
    resume = _find_resume_file()
    if resume:
        print(f"[Startup] Resume file detected: {resume.name}")
        chunks = resume_parser.parse(str(resume))
        return chunks, resume.name
    print("[Startup] No resume file found — using profile.json")
    return profile_service.get_chunks(), "profile.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Loading candidate profile (sidebar data)...")
    profile_service.load()

    print("[Startup] Waiting for Ollama to be ready...")
    for attempt in range(30):
        if await ollama_service.health_check():
            print("[Startup] Ollama is ready.")
            break
        print(f"[Startup] Ollama not ready (attempt {attempt + 1}/30), retrying in 5s...")
        await asyncio.sleep(5)
    else:
        print("[Startup] WARNING: Ollama health check timed out — proceeding anyway.")

    chunks, source = _get_chunks()
    print(f"[Startup] Indexing {len(chunks)} chunks from '{source}'...")
    await embedding_service.index(chunks)
    print("[Startup] Initialisation complete. Bot is ready.")
    yield


app = FastAPI(
    title="Personal AI Recruiter Bot",
    description="AI-powered recruiter assistant backed by RAG + Ollama",
    version="1.0.0",
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
    session_id: str = ""


class LeadRequest(BaseModel):
    name: str
    email: str = ""
    company: str = ""
    message: str = ""
    session_id: str = ""


@app.get("/health")
async def health():
    ollama_ok = await ollama_service.health_check()
    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "unavailable",
        "profile_loaded": bool(profile_service.get_profile()),
        "chunks_indexed": embedding_service.collection.count(),
    }


@app.get("/status")
async def status():
    resume = _find_resume_file()
    return {
        "mode": "resume" if resume else "profile_json",
        "source_file": resume.name if resume else "profile.json",
        "chunks_indexed": embedding_service.collection.count(),
    }


@app.get("/profile")
async def get_profile():
    profile = profile_service.get_profile()
    if not profile:
        raise HTTPException(status_code=503, detail="Profile not loaded yet")
    return profile


@app.get("/resume/download")
async def download_resume():
    resume = _find_resume_file()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet")
    candidate_slug = settings.candidate_name.replace(" ", "_")
    return FileResponse(
        resume,
        media_type="application/octet-stream",
        filename=f"{candidate_slug}_Resume{resume.suffix}",
    )


@app.post("/upload/resume", dependencies=[Depends(require_admin)])
async def upload_resume(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED_RESUME_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Upload a PDF or DOCX."
        )

    data_dir = Path(settings.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    # Remove any previously uploaded resume
    for ext in _ALLOWED_RESUME_EXTS:
        old = data_dir / f"resume{ext}"
        if old.exists():
            old.unlink()

    # Save new file
    dest = data_dir / f"resume{suffix}"
    content = await file.read()
    dest.write_bytes(content)
    print(f"[Upload] Saved resume to {dest} ({len(content):,} bytes)")

    # Parse → re-index
    try:
        chunks = resume_parser.parse(str(dest))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Resume parsing failed: {e}")

    embedding_service.reset_index()
    await embedding_service.index(chunks)

    return {
        "status": "indexed",
        "filename": file.filename,
        "chunks": len(chunks),
    }


@app.delete("/upload/resume", dependencies=[Depends(require_admin)])
async def delete_resume():
    data_dir = Path(settings.data_dir)
    removed = []
    for ext in _ALLOWED_RESUME_EXTS:
        f = data_dir / f"resume{ext}"
        if f.exists():
            f.unlink()
            removed.append(f.name)

    # Re-index using profile.json
    embedding_service.reset_index()
    chunks = profile_service.get_chunks()
    await embedding_service.index(chunks)

    return {
        "status": "reverted_to_profile_json",
        "removed": removed,
        "chunks": len(chunks),
    }


@app.get("/video/status")
async def video_status():
    video = _find_video_file()
    return {"exists": video is not None, "filename": video.name if video else None}


@app.get("/video")
async def get_video():
    video = _find_video_file()
    if not video:
        raise HTTPException(status_code=404, detail="No intro video uploaded yet")
    return FileResponse(video, media_type=_ALLOWED_VIDEO_EXTS[video.suffix.lower()])


@app.post("/upload/video", dependencies=[Depends(require_admin)])
async def upload_video(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED_VIDEO_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Upload MP4, WebM, or MOV."
        )

    data_dir = Path(settings.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    for ext in _ALLOWED_VIDEO_EXTS:
        old = data_dir / f"intro_video{ext}"
        if old.exists():
            old.unlink()

    dest = data_dir / f"intro_video{suffix}"
    max_bytes = settings.max_video_mb * 1024 * 1024
    written = 0

    try:
        with open(dest, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Video exceeds the {settings.max_video_mb}MB limit."
                    )
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise

    print(f"[Upload] Saved intro video to {dest} ({written:,} bytes)")
    return {"status": "uploaded", "filename": file.filename, "size_bytes": written}


@app.delete("/upload/video", dependencies=[Depends(require_admin)])
async def delete_video():
    data_dir = Path(settings.data_dir)
    removed = []
    for ext in _ALLOWED_VIDEO_EXTS:
        f = data_dir / f"intro_video{ext}"
        if f.exists():
            f.unlink()
            removed.append(f.name)
    return {"status": "removed", "removed": removed}


@app.post("/leads")
async def create_lead(lead: LeadRequest):
    if not lead.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    lead_id = await asyncio.to_thread(
        leads_service.add_lead,
        lead.name.strip(),
        lead.email.strip(),
        lead.company.strip(),
        lead.message.strip(),
        lead.session_id,
    )
    return {"status": "ok", "id": lead_id}


@app.get("/admin/analytics", dependencies=[Depends(require_admin)])
async def admin_analytics():
    leads = await asyncio.to_thread(leads_service.list_leads)
    questions = await asyncio.to_thread(leads_service.recent_questions)
    totals = await asyncio.to_thread(leads_service.stats)
    return {"leads": leads, "recent_questions": questions, "totals": totals}


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    await asyncio.to_thread(leads_service.log_chat, request.session_id, request.message.strip())

    async def event_stream():
        try:
            async for event in rag_service.stream(request.message, request.history):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
