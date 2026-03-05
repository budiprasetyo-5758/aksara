"""
AKSARA RSCM — Configuration
Loaded from .env file at the project root.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Supabase ────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""  # Use service-role key for server-side access

    # ── Model Paths / HuggingFace ──────────────────────
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"
    LLM_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"

    # ── HuggingFace Inference API (optional) ───────────
    HF_API_TOKEN: str = ""

    # ── RAG Parameters ─────────────────────────────────
    CHUNK_SIZE: int = 512          # tokens per chunk
    CHUNK_OVERLAP: int = 50        # overlapping tokens
    TOP_K_RETRIEVAL: int = 20      # initial retrieval candidates
    TOP_K_RERANK: int = 5          # after reranking
    SIMILARITY_THRESHOLD: float = 0.5

    # ── CORS ───────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
