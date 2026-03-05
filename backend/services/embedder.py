"""
AKSARA RSCM — Embedding Service
Uses BAAI/bge-m3 via sentence-transformers to generate 1024-dim embeddings.
"""

from sentence_transformers import SentenceTransformer
from config import settings
import numpy as np

_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """Load the embedding model (lazy singleton)."""
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts using bge-m3.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of 1024-dimensional embedding vectors.
    """
    model = get_embedding_model()
    # bge-m3 expects instruction prefix for queries (not for passages)
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Generate embedding for a single query.
    Uses the instruction prefix recommended for bge-m3 retrieval.

    Args:
        query: The user's search query.

    Returns:
        1024-dimensional embedding vector.
    """
    model = get_embedding_model()
    # For retrieval, bge-m3 can benefit from a task instruction
    embedding = model.encode(query, normalize_embeddings=True)
    return embedding.tolist()


def store_embeddings_in_supabase(
    document_id: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> int:
    """
    Batch insert chunk embeddings into the document_chunks table.

    Args:
        document_id: UUID of the parent document.
        chunks: List of chunk dicts with text, page_number, bbox, chunk_index.
        embeddings: Corresponding embedding vectors.

    Returns:
        Number of chunks inserted.
    """
    from services.supabase_client import get_supabase_client

    client = get_supabase_client()
    rows = []

    for chunk, embedding in zip(chunks, embeddings):
        rows.append(
            {
                "document_id": document_id,
                "chunk_index": chunk["chunk_index"],
                "content": chunk["text"],
                "page_number": chunk["page_number"],
                "bbox_x": chunk["bbox"]["x"],
                "bbox_y": chunk["bbox"]["y"],
                "bbox_width": chunk["bbox"]["width"],
                "bbox_height": chunk["bbox"]["height"],
                "embedding": embedding,
            }
        )

    # Batch insert (Supabase supports up to ~1000 rows per request)
    batch_size = 500
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        client.table("document_chunks").insert(batch).execute()
        total += len(batch)

    return total
