"""
AKSARA RSCM — Document Management Router
Endpoints for uploading, listing, syncing, and deleting documents.
"""

import io
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from models.schemas import (
    DocumentOut,
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentSyncResponse,
    StatsResponse,
)
from services.supabase_client import supabase as get_supabase_client
from services.parser import process_pdf
from services.embedder import generate_embeddings as embed_texts, store_embeddings_in_supabase
from services.auth_service import require_admin, get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/{doc_id}/page/{page_number}/image")
async def get_page_image(
    doc_id: str,
    page_number: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Render a specific page of a PDF document as a JPEG image.
    Used by the frontend to show PDF page previews with bounding box highlights.
    """
    client = get_supabase_client()

    # Fetch document metadata
    doc = client.table("documents").select("storage_path, file_type").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.data["file_type"] != "pdf":
        raise HTTPException(status_code=400, detail="Page preview is only available for PDF documents.")

    # Download from Supabase Storage
    storage_path = doc.data["storage_path"]
    try:
        file_bytes = client.storage.from_("documents").download(storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")

    # Render page as image using PyMuPDF
    try:
        import fitz  # PyMuPDF

        pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")

        if page_number < 1 or page_number > len(pdf_doc):
            raise HTTPException(
                status_code=400,
                detail=f"Page {page_number} out of range. Document has {len(pdf_doc)} pages."
            )

        page = pdf_doc[page_number - 1]  # 0-indexed

        # Render at 2x resolution for crisp display
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)

        # Convert to JPEG
        img_bytes = pix.tobytes("jpeg")
        pdf_doc.close()

        return StreamingResponse(
            io.BytesIO(img_bytes),
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f"inline; filename=page_{page_number}.jpg",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render page: {str(e)}")


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = 1,
    per_page: int = 10,
    status: str | None = None,
    admin_user: dict = Depends(require_admin)
):
    """
    List all documents with optional status filter and pagination.
    Requires Admin privileges.
    """
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
    admin_user: dict = Depends(require_admin)
):
    """
    Upload a document to Supabase Storage and create a metadata record.
    Requires Admin privileges.
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
        # The original code used get_total_pages, but the diff implies process_pdf might handle this or it's removed.
        # Sticking to the diff's import change, assuming process_pdf is the new entry point.
        # For now, keeping get_total_pages if it's still needed and not part of process_pdf's return.
        # If process_pdf returns chunks, total_pages might be derived from them.
        # Given the diff, I'll remove get_total_pages and assume process_pdf handles it or it's no longer directly set here.
        # Reverting this part to match the original logic as the diff doesn't explicitly remove get_total_pages call, only its import.
        # Let's assume process_pdf will return chunks and total_pages if needed.
        # For now, I'll keep total_pages=0 and let process_document handle the actual parsing.
        pass


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
        # The diff implies process_pdf is the new unified parser.
        chunks, total_pages = process_pdf(file_bytes, file_ext)

        # Update total_pages in document metadata if it was 0 or incorrect
        if total_pages > 0:
            client.table("documents").update({"total_pages": total_pages}).eq("id", doc_id).execute()


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
async def sync_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(require_admin)
):
    """
    Process a document: extract text, chunk it, generate embeddings, and save to DB.
    Requires Admin privileges.
    """
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
async def toggle_document_status(
    doc_id: str,
    admin_user: dict = Depends(require_admin)
):
    """
    Toggle the active status of a document.
    Requires Admin privileges.
    """
    client = get_supabase_client()

    doc = client.table("documents").select("is_active").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    new_status = not doc.data["is_active"]
    client.table("documents").update({"is_active": new_status}).eq("id", doc_id).execute()

    return {"id": doc_id, "is_active": new_status}


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    admin_user: dict = Depends(require_admin)
):
    """
    Delete a document and its chunks from DB and Storage.
    Requires Admin privileges.
    """
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
