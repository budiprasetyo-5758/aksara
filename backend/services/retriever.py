"""
AKSARA RSCM — Retrieval & Reranking Service
1. Query rewriting / expansion for short prompts
2. Vector search in Supabase pgvector (top-K candidates)
3. Cross-encoder reranking with BAAI/bge-reranker-v2-m3
"""

from services.supabase_client import get_supabase_client
from services.embedder import embed_query
from models.schemas import SourceReference, BoundingBox
from config import settings
import httpx


# ── Query Rewriting ────────────────────────────────────

QUERY_REWRITER_PROMPT = """Anda adalah query expander untuk sistem RAG di RSCM (Rumah Sakit Cipto Mangunkusumo).

Tugas Anda: Menerima query pendek/singkat dari pengguna rumah sakit, lalu memperluas dan menulis ulang menjadi query pencarian semantik yang detail dan optimal untuk pencarian vektor.

Aturan:
1. Perluas semua singkatan dan akronim rumah sakit, misalnya:
   - "perdir" → "Peraturan Direktur Utama RSUP Nasional Dr. Cipto Mangunkusumo"
   - "SPO" → "Standar Prosedur Operasional"
   - "VIP" → "Very Important Person / ruangan kelas VIP"
   - "DPJP" → "Dokter Penanggung Jawab Pelayanan"
   - "JKN" → "Jaminan Kesehatan Nasional"
   - "BPJS" → "Badan Penyelenggara Jaminan Sosial"
   - "IGD" → "Instalasi Gawat Darurat"
   - "ICU" → "Intensive Care Unit"
   - "OK" → "Kamar Operasi / Operating Room"
   - "RM" → "Rekam Medis"
   - "PPK" → "Panduan Praktik Klinis"
2. Tambahkan konteks yang relevan sesuai domain rumah sakit.
3. Jawab HANYA dengan query yang sudah diperluas, tanpa penjelasan tambahan.
4. Pertahankan bahasa Indonesia.
5. Jangan ubah makna asli query, hanya perluas agar lebih detail.
6. Jika query sudah cukup detail, kembalikan query asli tanpa perubahan."""


def rewrite_query(raw_query: str) -> str:
    """
    Rewrite a short/vague user query into a detailed semantic search query
    using the LLM. Falls back to the original query on error.
    """
    # Skip rewriting for very long or detailed queries
    if len(raw_query.split()) > 15:
        return raw_query

    try:
        from services.generator import get_inference_client

        client = get_inference_client()
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": QUERY_REWRITER_PROMPT},
                {"role": "user", "content": raw_query},
            ],
            model=settings.DOC_LLM_MODEL,
            max_tokens=200,
            temperature=0.1,
        )
        rewritten = response.choices[0].message.content.strip()
        if rewritten:
            print(f"[QueryRewriter] '{raw_query}' → '{rewritten}'")
            return rewritten
    except Exception as e:
        print(f"[QueryRewriter] Failed, using original query: {e}")

    return raw_query


# ── Vector Retrieval ───────────────────────────────────

def retrieve_relevant_chunks(query: str, document_id: str | None = None) -> list[dict]:
    """
    Perform vector similarity search in Supabase and return top-K candidates.
    When document_id is provided, restricts results to chunks from that document.

    Args:
        query: The user's search query.
        document_id: Optional ID to scope search to a specific document.

    Returns:
        List of chunk dicts with content, metadata, and similarity score.
    """
    client = get_supabase_client()
    query_embedding = embed_query(query)

    if document_id:
        # Scoped search — only chunks from the specified document
        response = client.rpc(
            "match_document_chunks_by_id",
            {
                "query_embedding": query_embedding,
                "filter_document_id": document_id,
                "match_threshold": 0.3,  # Lower threshold for scoped search
                "match_count": settings.TOP_K_RETRIEVAL,
            },
        ).execute()
    else:
        # Global search across all active documents
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

    headers = {
        "Authorization": f"Bearer {settings.JINA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    documents = [chunk["content"] for chunk in chunks]
    payload = {
        "model": settings.RERANKER_MODEL,
        "query": query,
        "documents": documents
    }
    
    try:
        with httpx.Client() as client:
            response = client.post("https://api.jina.ai/v1/rerank", headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            results = response.json().get("results", [])
            
        for res in results:
            idx = res["index"]
            chunks[idx]["rerank_score"] = res["relevance_score"]
    except Exception as e:
        print(f"Reranking failed: {e}")
        # Fallback to order derived from retrieval
        for i, chunk in enumerate(chunks):
            chunk["rerank_score"] = float(len(chunks) - i)

    ranked = sorted(chunks, key=lambda c: c.get("rerank_score", 0.0), reverse=True)
    return ranked[: settings.TOP_K_RERANK]


def retrieve_and_rerank(query: str, document_id: str | None = None) -> tuple[list[dict], list[SourceReference]]:
    """
    Full retrieval pipeline: query rewriting → vector search → reranking → source references.

    Args:
        query: The user's search query.
        document_id: Optional ID to scope search to a specific document.
        file_url: Optional URL to scope search to a specific document.

    Returns:
        Tuple of (reranked_chunks, source_references).
    """
    # Step 0: Rewrite/expand the query for better retrieval
    rewritten_query = rewrite_query(query)

    # Step 1: Vector search (scoped if document_id is provided)
    candidates = retrieve_relevant_chunks(rewritten_query, document_id=document_id)

    # Step 2: Cross-encoder reranking (using rewritten query)
    top_chunks = rerank_chunks(rewritten_query, candidates)

    # Step 3: Build source references for frontend
    sources: list[SourceReference] = []
    seen_contents = set()

    for chunk in top_chunks:
        content = chunk.get("content", "")
        # Very simple deduplication of identical chunk content
        if content in seen_contents:
            continue
        seen_contents.add(content)
        
        # Extract metadata if available, otherwise fallback
        metadata = chunk.get("metadata") or {}
        
        if "file_name" in metadata:
            file_name = metadata["file_name"]
        else:
            # Fallback for old chunks without metadata
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
                page_number=chunk.get("page_number") or metadata.get("page_number", 1),
                bbox=BoundingBox(
                    x=chunk.get("bbox_x", 0),
                    y=chunk.get("bbox_y", 0),
                    width=chunk.get("bbox_width", 0),
                    height=chunk.get("bbox_height", 0),
                ),
                content=content,
            )
        )

    return top_chunks, sources

