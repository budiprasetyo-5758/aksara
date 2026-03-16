"""
AKSARA RSCM — Chat Router
RAG pipeline endpoint: retrieve → rerank → generate.
Now also persists messages to `chat_messages` table.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from models.schemas import ChatRequest, ChatResponse
from services.retriever import retrieve_and_rerank
from services.generator import generate_answer
from services.auth_service import get_current_user
from services.supabase_client import get_supabase_client

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
    6. Persist user and assistant messages to chat_messages table.
    """
    query = request.message

    # Step 1-3: Retrieve and rerank
    top_chunks, sources = retrieve_and_rerank(query)

    # Step 4: Generate answer
    answer = generate_answer(query, top_chunks)

    # Step 5-6: Persist messages if a session_id is provided
    if request.session_id:
        try:
            client = get_supabase_client()

            # Insert user message
            client.table("chat_messages").insert({
                "session_id": request.session_id,
                "role": "user",
                "content": query,
            }).execute()

            # Insert assistant message
            client.table("chat_messages").insert({
                "session_id": request.session_id,
                "role": "assistant",
                "content": answer,
                "sources": [s.model_dump() for s in sources] if sources else None
            }).execute()

            # Auto-update session title from the first user message
            # (only if current title is still "New Chat")
            session = (
                client.table("chat_sessions")
                .select("title")
                .eq("id", request.session_id)
                .single()
                .execute()
            )
            if session.data and session.data.get("title") == "New Chat":
                short_title = query[:50] + ("..." if len(query) > 50 else "")
                client.table("chat_sessions").update(
                    {"title": short_title}
                ).eq("id", request.session_id).execute()

        except Exception as e:
            # Don't fail the chat response if persistence fails
            print(f"[Chat] Warning: Failed to persist messages: {e}")

    return ChatResponse(
        answer=answer,
        sources=sources,
        session_id=request.session_id,
    )
