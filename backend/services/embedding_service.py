import chromadb
from chromadb.config import Settings as ChromaSettings
from services.ollama_service import OllamaService
from config import settings


class EmbeddingService:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.chroma_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="candidate_profile",
            metadata={"hnsw:space": "cosine"},
        )
        self.ollama = OllamaService()

    def _already_indexed(self) -> bool:
        return self.collection.count() > 0

    async def index(self, chunks: list[dict]) -> None:
        if self._already_indexed():
            print(f"[EmbeddingService] Profile already indexed ({self.collection.count()} chunks). Skipping.")
            return

        print(f"[EmbeddingService] Indexing {len(chunks)} profile chunks...")
        for chunk in chunks:
            embedding = await self.ollama.embed(chunk["text"])
            self.collection.add(
                documents=[chunk["text"]],
                embeddings=[embedding],
                ids=[chunk["id"]],
                metadatas=[chunk["metadata"]],
            )
            print(f"  Indexed chunk: {chunk['id']}")

        print(f"[EmbeddingService] Indexing complete — {len(chunks)} chunks stored.")

    async def retrieve(self, query: str, n_results: int = 4) -> list[dict]:
        query_embedding = await self.ollama.embed(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, self.collection.count()),
        )
        documents = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        return [
            {"text": doc, "section": (meta or {}).get("section", "general")}
            for doc, meta in zip(documents, metadatas)
        ]

    def reset_index(self) -> None:
        self.client.delete_collection("candidate_profile")
        self.collection = self.client.get_or_create_collection(
            name="candidate_profile",
            metadata={"hnsw:space": "cosine"},
        )
