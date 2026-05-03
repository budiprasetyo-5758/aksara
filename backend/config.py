"""
AKSARA RSCM — Configuration
Loaded from .env file at the project root.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Supabase ────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""           # Legacy alias
    SUPABASE_ANON_KEY: str = ""              # Public anon key (for JWT verification)
    SUPABASE_SERVICE_ROLE_KEY: str = ""       # Service role key (bypasses RLS)

    # ── Model Paths / HuggingFace ──────────────────────
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"

    # ── LLM Models (OpenRouter) ───────────────────────
    # Ganti model di sini sesuai kebutuhan. Lihat https://openrouter.ai/models
    LLM_MODEL: str = "google/gemini-3.1-pro-preview"              # Chat RAG
    DOC_LLM_MODEL: str = "google/gemini-3.1-pro-preview"                      # Document + Query rewriter
    VISION_MODEL: str = "google/gemini-3.1-pro-preview"         # Vision / OCR

    # ── HuggingFace Inference API (optional) ───────────
    HF_API_TOKEN: str = ""

    # ── OpenRouter API ───────────
    OPENROUTER_API_KEY: str = ""

    # ── Groq API (legacy, diganti OpenRouter) ───────────
    # GROQ_API_KEY: str = ""

    # ── Jina AI API (Reranker) ───────────
    JINA_API_KEY: str = ""

    # ── RAG Parameters ─────────────────────────────────
    CHUNK_SIZE: int = 512          # tokens per chunk
    CHUNK_OVERLAP: int = 50        # overlapping tokens
    TOP_K_RETRIEVAL: int = 20      # initial retrieval candidates
    TOP_K_RERANK: int = 3          # after reranking (reduced to avoid Groq TPM limit)
    SIMILARITY_THRESHOLD: float = 0.5

    # ── CORS ───────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @property
    def effective_service_key(self) -> str:
        """Return the best available service key for server-side operations."""
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_SERVICE_KEY

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
