"""
AKSARA RSCM — Chat Router
RAG pipeline endpoint: retrieve → rerank → generate.
Now also persists messages to `chat_messages` table.
Supports multimodal input (images and PDFs).

Performance:
- Chat history fetch runs concurrently with RAG retrieval via asyncio.gather()
- Message persistence runs in background (doesn't block response)
- All sync Supabase calls wrapped in asyncio.to_thread()
"""

import asyncio
import base64
import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from models.schemas import ChatRequest, ChatResponse
from services.retriever import retrieve_and_rerank
from services.generator import generate_answer, generate_answer_stream, generate_answer_with_doc_context, generate_answer_vision
from services.auth_service import get_current_user
from services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/chat", tags=["Chat"])


async def get_chat_history(session_id: str, limit: int = 6) -> list[dict]:
    """Fetch the most recent chat history for a session (async, non-blocking)."""
    if not session_id:
        return []
    try:
        client = get_supabase_client()
        response = await asyncio.to_thread(
            lambda: (
                client.table("chat_messages")
                .select("role, content")
                .eq("session_id", session_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
        )
        if response.data:
            return list(reversed(response.data))
    except Exception as e:
        print(f"[Chat] Warning: Failed to fetch chat history: {e}")
    return []


def _persist_messages_sync(
    session_id: str,
    query: str,
    answer: str,
    sources: list | None,
    attachment_name: str | None = None,
):
    """Synchronous helper for persisting messages. Runs in a background task.
    
    Batches the 2 message inserts into 1 call and combines title check+update.
    """
    try:
        client = get_supabase_client()

        # Batch insert both messages in a single call (2 round-trips → 1)
        messages_to_insert = [
            {
                "session_id": session_id,
                "role": "user",
                "content": query,
                **({"attachment_name": attachment_name} if attachment_name else {}),
            },
            {
                "session_id": session_id,
                "role": "assistant",
                "content": answer,
                "sources": [s.model_dump() for s in sources] if sources else None,
            },
        ]
        client.table("chat_messages").insert(messages_to_insert).execute()

        # Auto-update session title from the first user message
        # (only if current title is still "New Chat")
        session = (
            client.table("chat_sessions")
            .select("title")
            .eq("id", session_id)
            .single()
            .execute()
        )
        if session.data and session.data.get("title") == "New Chat":
            if attachment_name:
                short_title = f"📎 {attachment_name[:40]}"
            else:
                short_title = query[:50] + ("..." if len(query) > 50 else "")
            client.table("chat_sessions").update(
                {"title": short_title}
            ).eq("id", session_id).execute()

    except Exception as e:
        # Don't fail — this runs in background
        print(f"[Chat] Warning: Failed to persist messages: {e}")


class ChatMessageRequest(BaseModel):
    """Frontend sends { session_id, message, file_url? }."""
    message: str
    session_id: str | None = None
    document_id: str | None = None  # Optional document ID for scoped retrieval


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatMessageRequest,
    background_tasks: BackgroundTasks,
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
    6. Persist user and assistant messages to chat_messages table (background).
    """
    query = request.message

    # Step 1-3: Retrieve/rerank + fetch history CONCURRENTLY (P4 optimization)
    async def _empty_history():
        return []

    retrieval_task = retrieve_and_rerank(query, document_id=request.document_id)
    history_task = get_chat_history(request.session_id) if request.session_id else _empty_history()

    (top_chunks, sources), history = await asyncio.gather(retrieval_task, history_task)

    # ── Debug logging ──────────────────────────────────
    print(f"[Chat DEBUG] Query: {query[:80]}")
    print(f"[Chat DEBUG] document_id: {request.document_id}")
    print(f"[Chat DEBUG] Chunks retrieved: {len(top_chunks)}")
    print(f"[Chat DEBUG] History messages: {len(history)}")
    if top_chunks:
        for i, c in enumerate(top_chunks):
            print(f"[Chat DEBUG]   Chunk {i}: page={c.get('page_number','?')}, len={len(c.get('content',''))}")
    else:
        print("[Chat DEBUG]   ⚠ NO CHUNKS RETRIEVED — context will be empty!")
    # ───────────────────────────────────────────────────

    # Step 4: Generate answer (wrapped in thread since OpenAI SDK is sync)
    answer = await asyncio.to_thread(generate_answer, query, top_chunks, history)

    # Step 5-6: Persist messages in BACKGROUND (doesn't block response)
    if request.session_id:
        background_tasks.add_task(
            _persist_messages_sync,
            request.session_id,
            query,
            answer,
            sources,
        )

    return ChatResponse(
        answer=answer,
        sources=sources,
        session_id=request.session_id,
    )


@router.post("/stream")
async def chat_stream(
    request: ChatMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    SSE streaming RAG endpoint.
    Same pipeline as POST /api/chat/ but streams tokens via Server-Sent Events.
    Dramatically reduces Time to First Token (TTFT).
    """
    import json
    query = request.message

    # Retrieve/rerank + fetch history concurrently
    async def _empty_history():
        return []

    retrieval_task = retrieve_and_rerank(query, document_id=request.document_id)
    history_task = get_chat_history(request.session_id) if request.session_id else _empty_history()

    (top_chunks, sources), history = await asyncio.gather(retrieval_task, history_task)

    # Stream wrapper: yields tokens, then persists in background after stream completes
    async def _sse_generator():
        full_answer = ""
        # First, send sources as the initial event so frontend has them immediately
        sources_data = [s.model_dump() for s in sources] if sources else []
        yield f'data: {json.dumps({"sources": sources_data, "session_id": request.session_id})}\n\n'

        # Stream LLM tokens
        async for chunk in generate_answer_stream(query, top_chunks, history=history):
            yield chunk
            # Extract full_answer from the final done message
            try:
                chunk_data = json.loads(chunk.replace('data: ', '').strip())
                if chunk_data.get('done') and 'full_answer' in chunk_data:
                    full_answer = chunk_data['full_answer']
            except (json.JSONDecodeError, ValueError):
                pass

        # Persist messages in background after stream completes
        if request.session_id and full_answer:
            _persist_messages_sync(
                request.session_id,
                query,
                full_answer,
                sources,
            )

    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.post("/multimodal", response_model=ChatResponse)
async def chat_multimodal(
    message: str = Form(""),
    session_id: str = Form(None),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user),
):
    """
    Multimodal chat endpoint — accepts a file (image or PDF) alongside text.

    Routing:
    - PDF (.pdf) → Extract text with PyMuPDF → inject into LLM prompt context
    - Image (.png, .jpg, .jpeg) → Encode to base64 → send to OpenRouter Vision model
    """
    query = message.strip() or "Jelaskan isi file ini."
    file_bytes = await file.read()
    file_name = file.filename or "attachment"
    content_type = file.content_type or ""

    sources = []
    answer = ""
    history_task = get_chat_history(session_id) if session_id else None

    if content_type == "application/pdf" or file_name.lower().endswith(".pdf"):
        # ── PDF path: extract text with PyMuPDF ────────────
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            extracted_text = ""
            for page in doc:
                extracted_text += page.get_text()
            doc.close()
        except Exception as e:
            print(f"[Multimodal] PyMuPDF extraction error: {e}")
            extracted_text = ""

        if not extracted_text.strip():
            answer = "Maaf, tidak dapat mengekstrak teks dari dokumen PDF yang dilampirkan. Dokumen mungkin berupa gambar/scan."
            history = await history_task if history_task else []
        else:
            # Run RAG retrieval + history fetch concurrently
            retrieval_task = retrieve_and_rerank(query)
            tasks_to_run = [retrieval_task]
            if history_task:
                tasks_to_run.append(history_task)

            if history_task:
                (top_chunks, sources), history = await asyncio.gather(*tasks_to_run)
            else:
                (top_chunks, sources), = await asyncio.gather(retrieval_task)
                history = []

            answer = await asyncio.to_thread(
                generate_answer_with_doc_context, query, extracted_text, top_chunks, history
            )

    elif content_type.startswith("image/") or file_name.lower().endswith((".png", ".jpg", ".jpeg")):
        # ── Image path: encode to base64, call vision model ──
        image_b64 = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = content_type if content_type.startswith("image/") else "image/jpeg"

        history = await history_task if history_task else []
        answer = await asyncio.to_thread(
            generate_answer_vision, query, image_b64, mime_type, history
        )
    else:
        answer = f"Maaf, format file `{content_type}` belum didukung. Silakan lampirkan file PDF atau gambar (PNG/JPG)."

    # ── Persist messages in BACKGROUND ─────────────────────
    if session_id:
        background_tasks.add_task(
            _persist_messages_sync,
            session_id,
            query,
            answer,
            sources,
            attachment_name=file_name,
        )

    return ChatResponse(
        answer=answer,
        sources=sources,
        session_id=session_id,
    )
