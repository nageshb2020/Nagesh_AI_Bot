"""
In-memory vector store using FastEmbed (ONNX, CPU-only, ~33 MB model).
Replaces ChromaDB — works on any Python 3.9+ environment without system deps.
"""

import numpy as np
from fastembed import TextEmbedding
from config import settings


class EmbedService:
    def __init__(self):
        print(f"[EmbedService] Loading '{settings.embed_model}' (downloads ~33 MB on first run)...")
        self._model = TextEmbedding(model_name=settings.embed_model)
        self._docs: list[str] = []
        self._matrix: np.ndarray | None = None
        print("[EmbedService] Embedding model ready.")

    def index(self, chunks: list[dict]) -> None:
        texts = [c["text"] for c in chunks]
        self._docs = texts
        print(f"[EmbedService] Embedding {len(texts)} chunks...")
        self._matrix = np.array(list(self._model.embed(texts)), dtype=np.float32)
        print(f"[EmbedService] Index built — shape {self._matrix.shape}")

    def retrieve(self, query: str, n: int = 4) -> list[str]:
        if self._matrix is None or not self._docs:
            return []
        q = np.array(list(self._model.embed([query]))[0], dtype=np.float32)
        doc_norms = np.linalg.norm(self._matrix, axis=1)
        q_norm = np.linalg.norm(q)
        denom = doc_norms * q_norm
        denom = np.where(denom == 0, 1e-8, denom)
        scores = self._matrix @ q / denom
        top_k = np.argsort(scores)[-n:][::-1]
        return [self._docs[i] for i in top_k]

    def reset(self) -> None:
        self._docs = []
        self._matrix = None

    @property
    def count(self) -> int:
        return len(self._docs)
