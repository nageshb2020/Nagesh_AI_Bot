"""
Extracts text from a PDF or DOCX resume and chunks it into semantic segments
for vector indexing.

Strategy:
  1. Detect section headers with regex (EXPERIENCE, SKILLS, EDUCATION, …)
  2. Emit one chunk per section; split oversized sections by blank lines
  3. Fall back to sliding-window chunking if no headers are detected
"""

import re
from pathlib import Path

# (chunk_id_prefix, regex) — order matters for overlap detection
_SECTION_PATTERNS: list[tuple[str, str]] = [
    ("summary",        r"(?im)^\s*(SUMMARY|PROFESSIONAL SUMMARY|PROFILE|ABOUT ME|CAREER OBJECTIVE|OBJECTIVE)\s*$"),
    ("experience",     r"(?im)^\s*(EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE|CAREER HISTORY|WORK HISTORY)\s*$"),
    ("skills",         r"(?im)^\s*(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|KEY SKILLS|EXPERTISE|COMPETENCIES)\s*$"),
    ("education",      r"(?im)^\s*(EDUCATION|ACADEMIC BACKGROUND|ACADEMIC QUALIFICATIONS|QUALIFICATIONS)\s*$"),
    ("projects",       r"(?im)^\s*(PROJECTS|KEY PROJECTS|PERSONAL PROJECTS|FEATURED PROJECTS|NOTABLE PROJECTS)\s*$"),
    ("certifications", r"(?im)^\s*(CERTIFICATIONS|CERTIFICATES|CREDENTIALS|LICENSES & CERTIFICATIONS)\s*$"),
    ("achievements",   r"(?im)^\s*(ACHIEVEMENTS|ACCOMPLISHMENTS|AWARDS|HONORS|RECOGNITION|AWARDS & HONORS)\s*$"),
    ("publications",   r"(?im)^\s*(PUBLICATIONS|ARTICLES|PAPERS|RESEARCH|TALKS & PUBLICATIONS)\s*$"),
]

_CHUNK_WORD_LIMIT = 800
_WINDOW_OVERLAP   = 80


def parse(file_path: str) -> list[dict]:
    """Public entry point: extract text → chunk → return list of RAG documents."""
    text = _extract_text(file_path)
    if not text.strip():
        raise ValueError("Could not extract any text from the resume. Is the file text-based (not a scanned image)?")
    chunks = _chunk(text)
    print(f"[ResumeParser] Extracted {len(chunks)} chunks from '{Path(file_path).name}'")
    return chunks


# ── Text extraction ───────────────────────────────────────────────────────────

def _extract_text(file_path: str) -> str:
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(file_path)
    if suffix in (".docx", ".doc"):
        return _extract_docx(file_path)
    raise ValueError(f"Unsupported file type '{suffix}'. Upload a PDF or DOCX.")


def _extract_pdf(file_path: str) -> str:
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def _extract_docx(file_path: str) -> str:
    from docx import Document
    doc = Document(file_path)
    lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n".join(lines)


# ── Chunking ──────────────────────────────────────────────────────────────────

def _chunk(text: str) -> list[dict]:
    boundaries = _find_sections(text)

    if not boundaries:
        print("[ResumeParser] No section headers detected — using sliding-window chunking.")
        return _sliding_window(text)

    chunks: list[dict] = []

    # Pre-header block: name / contact info / tagline
    first_start = boundaries[0][0]
    if first_start > 30:
        header_text = text[:first_start].strip()
        if header_text:
            chunks.append(_make_chunk("header", "contact_info", header_text))

    # One chunk per detected section
    for i, (start, name) in enumerate(boundaries):
        end = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(text)
        section_text = text[start:end].strip()
        if not section_text:
            continue

        if len(section_text.split()) > _CHUNK_WORD_LIMIT:
            chunks.extend(_split_section(section_text, name))
        else:
            chunks.append(_make_chunk(f"{name}_0", name, section_text))

    return chunks


def _find_sections(text: str) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    for name, pattern in _SECTION_PATTERNS:
        for match in re.finditer(pattern, text):
            found.append((match.start(), name))
    found.sort(key=lambda x: x[0])
    return found


def _split_section(text: str, section_name: str) -> list[dict]:
    """Split a large section (e.g. multiple jobs) by blank lines."""
    blocks = re.split(r"\n{2,}", text)
    chunks: list[dict] = []
    current = ""
    idx = 0
    for block in blocks:
        if len((current + block).split()) < _CHUNK_WORD_LIMIT:
            current += "\n\n" + block if current else block
        else:
            if current.strip():
                chunks.append(_make_chunk(f"{section_name}_{idx}", section_name, current.strip()))
                idx += 1
            current = block
    if current.strip():
        chunks.append(_make_chunk(f"{section_name}_{idx}", section_name, current.strip()))
    return chunks


def _sliding_window(text: str) -> list[dict]:
    words = text.split()
    chunks: list[dict] = []
    i, idx = 0, 0
    while i < len(words):
        segment = " ".join(words[i : i + _CHUNK_WORD_LIMIT])
        chunks.append(_make_chunk(f"window_{idx}", f"block_{idx}", segment))
        i += _CHUNK_WORD_LIMIT - _WINDOW_OVERLAP
        idx += 1
    return chunks


def _make_chunk(chunk_id: str, section: str, text: str) -> dict:
    return {
        "id": f"resume_{chunk_id}",
        "text": text,
        "metadata": {"section": section, "source": "resume"},
    }
