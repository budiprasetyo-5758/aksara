"""
AKSARA RSCM — Pydantic Schemas
Request & Response models for the API.
"""

from pydantic import BaseModel
from datetime import datetime


# ── Bounding Box ─────────────────────────────────────────
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


# ── Source Reference (returned to frontend) ──────────────
class SourceReference(BaseModel):
    document_id: str
    file_name: str
    page_number: int
    bbox: BoundingBox
    content: str  # Replaced 'snippet' with 'content' for more clarity

# ── Chat ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    query: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    session_id: str | None = None


# ── Document ─────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: str
    file_name: str
    file_size: int
    file_type: str
    upload_date: datetime
    status: str
    is_active: bool
    total_pages: int
    classification_id: str | None = None
    classification_name: str | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentOut]
    total: int
    page: int
    per_page: int


class DocumentUploadResponse(BaseModel):
    id: str
    file_name: str
    status: str
    message: str


class DocumentSyncResponse(BaseModel):
    id: str
    status: str
    chunks_processed: int
    message: str


class DocumentClassifyRequest(BaseModel):
    classification_id: str | None = None


class BulkClassifyRequest(BaseModel):
    document_ids: list[str]
    classification_id: str | None = None


# ── Chunk (internal) ────────────────────────────────────
class ChunkData(BaseModel):
    text: str
    page_number: int
    bbox: BoundingBox
    chunk_index: int
    metadata: dict  # Added for file_name and page_number JSONB storage

# ── Stats ────────────────────────────────────────────────
class StatsResponse(BaseModel):
    total_documents: int
    indexed_pages: int
    active_percentage: float
    storage_used_bytes: int


# ── Chat Sessions ────────────────────────────────────────
class SessionCreateRequest(BaseModel):
    title: str = "New Chat"


class SessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str


class MessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: list[SourceReference] | None = None
    attachment_name: str | None = None
    created_at: str


# ── Document Search ──────────────────────────────────────
class DocumentSearchResult(BaseModel):
    id: str
    file_name: str
    file_url: str
    file_type: str
    total_pages: int


# ── Document Classifications ────────────────────────────
class ClassificationOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_at: str
    updated_at: str


class ClassificationCreate(BaseModel):
    name: str
    description: str | None = None


class ClassificationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
