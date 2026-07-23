from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://ollama:11434"
    chat_model: str = "llama3.2"
    embed_model: str = "nomic-embed-text"
    chroma_path: str = "/app/chroma_db"
    profile_path: str = "/app/data/profile.json"
    data_dir: str = "/app/data"
    candidate_name: str = "Nagesh Bellary"
    admin_token: str = ""
    max_video_mb: int = 300

    model_config = {"env_file": ".env"}


settings = Settings()
