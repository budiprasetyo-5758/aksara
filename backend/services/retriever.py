"""
AKSARA RSCM — Retrieval & Reranking Service
1. Vector search in Supabase pgvector (top-K candidates)
2. Cross-encoder reranking with BAAI/bge-reranker-v2-m3
"""

from sentence_transformers import CrossEncoder
from services.supabase_client import get_supabase_client
from services.embedder import embed_query
from models.schemas import SourceReference, BoundingBox
from config import settings

_reranker: CrossEncoder | None = None


def get_reranker() -> CrossEncoder:
    """Load the reranker model (lazy singleton)."""
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder(settings.RERANKER_MODEL)
    return _reranker


def retrieve_relevant_chunks(query: str) -> list[dict]:
    """
    Perform vector similarity search in Supabase and return top-K candidates.

    Args:
        query: The user's search query.

    Returns:
        List of chunk dicts with content, metadata, and similarity score.
    """
    client = get_supabase_client()
    query_embedding = embed_query(query)

    # Call the match_document_chunks RPC function
    response = client.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_threshold": settings.SIMILARITY_THRESHOLD,
            "match_count": settings.TOP_K_RETRIEVAL,
        },
    ).execute()

    return response.data or []


def rerank_chunks(query: str, chunks: list[dict]) -> list[dict]:
    """
    Re-rank retrieved chunks using the bge-reranker-v2-m3 cross-encoder.

    Args:
        query: The user's search query.
        chunks: List of candidate chunks from vector search.

    Returns:
        Top-K reranked chunks sorted by relevance score.
    """
    if not chunks:
        return []

    reranker = get_reranker()

    # Prepare (query, passage) pairs for the cross-encoder
    pairs = [(query, chunk["content"]) for chunk in chunks]
    scores = reranker.predict(pairs)

    # Attach scores and sort
    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)

    ranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)
    return ranked[: settings.TOP_K_RERANK]


def retrieve_and_rerank(query: str) -> tuple[list[dict], list[SourceReference]]:
    """
    Full retrieval pipeline: vector search → reranking → source references.

    Args:
        query: The user's search query.

    Returns:
        Tuple of (reranked_chunks, source_references).
    """
    # Step 1: Vector search
    candidates = retrieve_relevant_chunks(query)

    # Step 2: Cross-encoder reranking
    top_chunks = rerank_chunks(query, candidates)

    # Step 3: Build source references for frontend
    sources: list[SourceReference] = []
    for chunk in top_chunks:
        # Fetch the document name
        client = get_supabase_client()
        doc_response = (
            client.table("documents")
            .select("file_name")
            .eq("id", chunk["document_id"])
            .single()
            .execute()
        )
        file_name = doc_response.data.get("file_name", "Unknown") if doc_response.data else "Unknown"

        sources.append(
            SourceReference(
                document_id=chunk["document_id"],
                file_name=file_name,
                page_number=chunk["page_number"],
                bbox=BoundingBox(
                    x=chunk["bbox_x"],
                    y=chunk["bbox_y"],
                    width=chunk["bbox_width"],
                    height=chunk["bbox_height"],
                ),
                snippet=chunk["content"][:200],
            )
        )

    return top_chunks, sources
