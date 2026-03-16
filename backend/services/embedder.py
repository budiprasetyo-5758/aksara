"""
AKSARA RSCM — Embedding Service
Uses BAAI/bge-m3 via sentence-transformers to generate 1024-dim embeddings.
"""

from config import settings
import numpy as np


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts using bge-m3.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of 1024-dimensional embedding vectors.
    """
    import httpx
    
    headers = {
        "Authorization": f"Bearer {settings.JINA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Process texts in batches
    all_embeddings = []
    batch_size = 50
    with httpx.Client() as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            payload = {
                "model": settings.EMBEDDING_MODEL,
                "input": batch
            }
            response = client.post("https://api.jina.ai/v1/embeddings", headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json().get("data", [])
            
            # API returns results in order, but we can sort by index just in case
            sorted_data = sorted(data, key=lambda x: x["index"])
            all_embeddings.extend([item["embedding"] for item in sorted_data])
            
    return all_embeddings


def embed_query(query: str) -> list[float]:
    """
    Generate embedding for a single query.
    Uses the instruction prefix recommended for bge-m3 retrieval.

    Args:
        query: The user's search query.

    Returns:
        1024-dimensional embedding vector.
    """
    import httpx
    
    headers = {
        "Authorization": f"Bearer {settings.JINA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": settings.EMBEDDING_MODEL,
        "input": [query]
    }
    
    with httpx.Client() as client:
        response = client.post("https://api.jina.ai/v1/embeddings", headers=headers, json=payload, timeout=30.0)
        response.raise_for_status()
        data = response.json().get("data", [])
        return data[0]["embedding"]


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
                "metadata": chunk.get("metadata", {}),
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
