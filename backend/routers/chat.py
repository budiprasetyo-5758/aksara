"""
AKSARA RSCM — Chat Router
RAG pipeline endpoint: retrieve → rerank → generate.
Now also persists messages to `chat_messages` table.
Supports multimodal input (images and PDFs).
"""

import base64
import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, UploadFile, File, Form
from pydantic import BaseModel
from models.schemas import ChatRequest, ChatResponse
from services.retriever import retrieve_and_rerank
from services.generator import generate_answer, generate_answer_with_doc_context, generate_answer_vision
from services.auth_service import get_current_user
from services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatMessageRequest(BaseModel):
    """Frontend sends { session_id, message, file_url? }."""
    message: str
    session_id: str | None = None
    document_id: str | None = None  # Optional document ID for scoped retrieval


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

    # Step 1-3: Retrieve and rerank (scoped to document if document_id provided)
    top_chunks, sources = retrieve_and_rerank(query, document_id=request.document_id)

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


@router.post("/multimodal", response_model=ChatResponse)
async def chat_multimodal(
    message: str = Form(""),
    session_id: str = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Multimodal chat endpoint — accepts a file (image or PDF) alongside text.

    Routing:
    - PDF (.pdf) → Extract text with PyMuPDF → inject into LLM prompt context
    - Image (.png, .jpg, .jpeg) → Encode to base64 → send to Groq Vision model
    """
    query = message.strip() or "Jelaskan isi file ini."
    file_bytes = await file.read()
    file_name = file.filename or "attachment"
    content_type = file.content_type or ""

    sources = []
    answer = ""

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
        else:
            # Also run RAG retrieval for supplementary context
            try:
                top_chunks, sources = retrieve_and_rerank(query)
            except Exception:
                top_chunks, sources = [], []

            answer = generate_answer_with_doc_context(query, extracted_text, top_chunks)

    elif content_type.startswith("image/") or file_name.lower().endswith((".png", ".jpg", ".jpeg")):
        # ── Image path: encode to base64, call vision model ──
        image_b64 = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = content_type if content_type.startswith("image/") else "image/jpeg"

        answer = generate_answer_vision(query, image_b64, mime_type)
    else:
        answer = f"Maaf, format file `{content_type}` belum didukung. Silakan lampirkan file PDF atau gambar (PNG/JPG)."

    # ── Persist messages ───────────────────────────────────
    if session_id:
        try:
            client = get_supabase_client()

            # Insert user message with attachment name
            client.table("chat_messages").insert({
                "session_id": session_id,
                "role": "user",
                "content": query,
                "attachment_name": file_name,
            }).execute()

            # Insert assistant message
            client.table("chat_messages").insert({
                "session_id": session_id,
                "role": "assistant",
                "content": answer,
                "sources": [s.model_dump() for s in sources] if sources else None,
            }).execute()

            # Auto-update session title
            session = (
                client.table("chat_sessions")
                .select("title")
                .eq("id", session_id)
                .single()
                .execute()
            )
            if session.data and session.data.get("title") == "New Chat":
                short_title = f"📎 {file_name[:40]}"
                client.table("chat_sessions").update(
                    {"title": short_title}
                ).eq("id", session_id).execute()

        except Exception as e:
            print(f"[Multimodal] Warning: Failed to persist messages: {e}")

    return ChatResponse(
        answer=answer,
        sources=sources,
        session_id=session_id,
    )
