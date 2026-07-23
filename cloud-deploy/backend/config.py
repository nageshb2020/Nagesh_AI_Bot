from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Identity ──────────────────────────────────────────────────────────────
    candidate_name: str = "Nagesh Bellary"
    data_dir: str = "./data"
    profile_path: str = "./data/profile.json"
    admin_token: str = ""

    # ── Embeddings — FastEmbed runs locally, no API key needed ───────────────
    embed_model: str = "BAAI/bge-small-en-v1.5"   # ~33 MB, downloads on first run

    # ── Chat provider: "ollama" (local) | "groq" (cloud) ─────────────────────
    chat_provider: str = "ollama"

    # Ollama (used when chat_provider=ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3.1:8b"

    # Groq (used when chat_provider=groq)
    groq_api_key: str = ""
    groq_model: str = "llama-3.2-8b-8192"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
