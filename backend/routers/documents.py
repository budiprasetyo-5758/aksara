"""
AKSARA RSCM — Document Management Router
Endpoints for uploading, listing, syncing, and deleting documents.
"""

import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from models.schemas import (
    DocumentOut,
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentSyncResponse,
    StatsResponse,
)
from services.supabase_client import get_supabase_client
from services.parser import parse_pdf, get_total_pages
from services.embedder import embed_texts, store_embeddings_in_supabase

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/", response_model=DocumentListResponse)
async def list_documents(page: int = 1, per_page: int = 10, status: str | None = None):
    """List all documents with optional status filter and pagination."""
    client = get_supabase_client()
    query = client.table("documents").select("*", count="exact")

    if status:
        query = query.eq("status", status)

    query = query.order("upload_date", desc=True)
    query = query.range((page - 1) * per_page, page * per_page - 1)

    response = query.execute()

    documents = [
        DocumentOut(
            id=str(d["id"]),
            file_name=d["file_name"],
            file_size=d["file_size"],
            file_type=d["file_type"],
            upload_date=d["upload_date"],
            status=d["status"],
            is_active=d["is_active"],
            total_pages=d["total_pages"],
        )
        for d in (response.data or [])
    ]

    return DocumentListResponse(
        documents=documents,
        total=response.count or 0,
        page=page,
        per_page=per_page,
    )


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Upload a document to Supabase Storage and create a metadata record.
    Processing (parsing + embedding) is done asynchronously in the background.
    """
    # Validate file type
    allowed_types = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}
    ext_map = {"application/pdf": "pdf", "text/plain": "txt"}

    file_ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "unknown"
    if file_ext not in ("pdf", "docx", "txt"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, or TXT.")

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=400, detail="File exceeds 25MB limit.")

    client = get_supabase_client()

    # Upload to Supabase Storage
    storage_path = f"uploads/{uuid.uuid4()}/{file.filename}"
    client.storage.from_("documents").upload(storage_path, file_bytes)

    # Get page count for PDFs
    total_pages = 0
    if file_ext == "pdf":
        total_pages = get_total_pages(file_bytes)

    # Insert document metadata
    doc_data = {
        "file_name": file.filename,
        "file_size": file_size,
        "file_type": file_ext,
        "status": "pending",
        "is_active": True,
        "total_pages": total_pages,
        "storage_path": storage_path,
    }

    result = client.table("documents").insert(doc_data).execute()
    doc_id = result.data[0]["id"]

    # Start background processing
    background_tasks.add_task(process_document, doc_id, file_bytes, file_ext)

    return DocumentUploadResponse(
        id=str(doc_id),
        file_name=file.filename or "unknown",
        status="pending",
        message="Document uploaded. Processing will begin shortly.",
    )


async def process_document(doc_id: str, file_bytes: bytes, file_ext: str):
    """
    Background task: parse document → generate embeddings → store in pgvector.
    Updates the document status throughout the pipeline.
    """
    client = get_supabase_client()

    try:
        # Update status to syncing
        client.table("documents").update({"status": "syncing"}).eq("id", doc_id).execute()

        # Parse document
        if file_ext == "pdf":
            chunks = parse_pdf(file_bytes)
        else:
            # For txt/docx, simple text chunking
            text = file_bytes.decode("utf-8", errors="ignore")
            from models.schemas import BoundingBox

            chunks_data = []
            words = text.split()
            chunk_size = 512
            for i in range(0, len(words), chunk_size - 50):
                chunk_text = " ".join(words[i : i + chunk_size])
                from models.schemas import ChunkData

                chunks_data.append(
                    ChunkData(
                        text=chunk_text,
                        page_number=1,
                        bbox=BoundingBox(x=0, y=0, width=0, height=0),
                        chunk_index=len(chunks_data),
                    )
                )
            chunks = chunks_data

        if not chunks:
            client.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()
            return

        # Generate embeddings
        texts = [c.text for c in chunks]
        embeddings = embed_texts(texts)

        # Store in Supabase
        chunk_dicts = [
            {
                "text": c.text,
                "page_number": c.page_number,
                "bbox": {"x": c.bbox.x, "y": c.bbox.y, "width": c.bbox.width, "height": c.bbox.height},
                "chunk_index": c.chunk_index,
            }
            for c in chunks
        ]
        store_embeddings_in_supabase(doc_id, chunk_dicts, embeddings)

        # Update status to indexed
        client.table("documents").update({"status": "indexed"}).eq("id", doc_id).execute()

    except Exception as e:
        print(f"Error processing document {doc_id}: {e}")
        client.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()


@router.post("/{doc_id}/sync", response_model=DocumentSyncResponse)
async def sync_document(doc_id: str, background_tasks: BackgroundTasks):
    """Re-process a document: delete old chunks and re-index."""
    client = get_supabase_client()

    # Check document exists
    doc = client.table("documents").select("*").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Delete existing chunks
    client.table("document_chunks").delete().eq("document_id", doc_id).execute()

    # Re-download from storage
    storage_path = doc.data["storage_path"]
    file_bytes = client.storage.from_("documents").download(storage_path)

    # Start re-processing
    background_tasks.add_task(process_document, doc_id, file_bytes, doc.data["file_type"])

    return DocumentSyncResponse(
        id=doc_id,
        status="syncing",
        chunks_processed=0,
        message="Document re-sync started.",
    )


@router.patch("/{doc_id}/toggle")
async def toggle_document(doc_id: str):
    """Toggle the is_active status of a document."""
    client = get_supabase_client()

    doc = client.table("documents").select("is_active").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    new_status = not doc.data["is_active"]
    client.table("documents").update({"is_active": new_status}).eq("id", doc_id).execute()

    return {"id": doc_id, "is_active": new_status}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and all its chunks."""
    client = get_supabase_client()

    doc = client.table("documents").select("storage_path").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Delete from storage
    if doc.data.get("storage_path"):
        try:
            client.storage.from_("documents").remove([doc.data["storage_path"]])
        except Exception:
            pass  # Storage deletion is best-effort

    # Delete chunks (cascade) and document
    client.table("documents").delete().eq("id", doc_id).execute()

    return {"message": "Document deleted successfully."}


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get document management statistics."""
    client = get_supabase_client()

    # Total documents
    total_resp = client.table("documents").select("id", count="exact").execute()
    total = total_resp.count or 0

    # Indexed pages
    pages_resp = client.table("documents").select("total_pages").eq("status", "indexed").execute()
    indexed_pages = sum(d["total_pages"] for d in (pages_resp.data or []))

    # Active percentage
    active_resp = client.table("documents").select("id", count="exact").eq("is_active", True).execute()
    active_count = active_resp.count or 0
    active_pct = (active_count / total * 100) if total > 0 else 0

    # Storage used
    size_resp = client.table("documents").select("file_size").execute()
    storage_bytes = sum(d["file_size"] for d in (size_resp.data or []))

    return StatsResponse(
        total_documents=total,
        indexed_pages=indexed_pages,
        active_percentage=round(active_pct, 1),
        storage_used_bytes=storage_bytes,
    )
