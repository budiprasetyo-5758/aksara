"""
AKSARA RSCM — Chat Router
RAG pipeline endpoint: retrieve → rerank → generate.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from models.schemas import ChatRequest, ChatResponse
from services.retriever import retrieve_and_rerank
from services.generator import generate_answer
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatMessageRequest(BaseModel):
    """Frontend sends { session_id, message }."""
    message: str
    session_id: str | None = None


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Main RAG endpoint.

    Pipeline:
    1. Embed the user query using bge-m3.
    2. Vector search in Supabase pgvector (top-20 candidates).
    3. Rerank with bge-reranker-v2-m3 → top-5 chunks.
    4. Generate answer with Qwen2.5-7B-Instruct based on context.
    5. Return answer + source references (page number, bounding boxes, snippet).
    """
    query = request.message

    # Step 1-3: Retrieve and rerank
    top_chunks, sources = retrieve_and_rerank(query)

    # Step 4: Generate answer
    if top_chunks:
        answer = generate_answer(query, top_chunks)
    else:
        answer = (
            "Maaf, saya tidak menemukan informasi yang relevan dalam dokumen yang tersedia. "
            "Silakan coba pertanyaan lain atau pastikan dokumen terkait sudah di-upload dan diindeks."
        )

    # Step 5: Return structured response
    return ChatResponse(
        answer=answer,
        sources=sources,
        session_id=request.session_id,
    )
