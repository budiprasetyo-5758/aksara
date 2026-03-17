"""
AKSARA RSCM — Document Management Router
Endpoints for uploading, listing, syncing, and deleting documents.
"""

import io
import uuid
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from models.schemas import (
    DocumentOut,
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentSyncResponse,
    DocumentSearchResult,
    StatsResponse,
)
from services.supabase_client import get_supabase_client, get_authenticated_client
from services.parser import parse_pdf, get_total_pages
from services.embedder import embed_texts, store_embeddings_in_supabase
from services.auth_service import require_admin, get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documents"])


# ── Document Search ────────────────────────────────────
@router.get("/search", response_model=list[DocumentSearchResult])
async def search_documents(
    q: str,
    current_user: dict = Depends(get_current_user),
):
    """Search for documents by keyword in file_name or chunk content."""
    if not q or len(q.strip()) < 2:
        return []

    client = get_supabase_client()
    keyword = q.strip()

    def get_signed_file_url(storage_path: str) -> str:
        """Generate a signed URL for private bucket access (1hr expiry)."""
        try:
            result = client.storage.from_("documents").create_signed_url(storage_path, 3600)
            return result.get("signedURL", "") if isinstance(result, dict) else ""
        except Exception:
            return client.storage.from_("documents").get_public_url(storage_path)

    # 1. Search by file_name (ilike)
    name_resp = (
        client.table("documents")
        .select("id, file_name, file_type, total_pages, storage_path")
        .eq("status", "indexed")
        .eq("is_active", True)
        .ilike("file_name", f"%{keyword}%")
        .limit(20)
        .execute()
    )

    # 2. Search by chunk content (ilike) → get distinct document_ids
    chunk_resp = (
        client.table("document_chunks")
        .select("document_id")
        .ilike("content", f"%{keyword}%")
        .limit(50)
        .execute()
    )

    # Collect unique document IDs
    seen_ids: set[str] = set()
    results: list[DocumentSearchResult] = []

    # Process file-name matches first
    for d in (name_resp.data or []):
        doc_id = str(d["id"])
        if doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)
        file_url = get_signed_file_url(d["storage_path"]) if d.get("storage_path") else ""
        results.append(DocumentSearchResult(
            id=doc_id,
            file_name=d["file_name"],
            file_url=file_url,
            file_type=d["file_type"],
            total_pages=d.get("total_pages", 0),
        ))

    # Process chunk-content matches
    chunk_doc_ids = list({str(c["document_id"]) for c in (chunk_resp.data or [])} - seen_ids)
    if chunk_doc_ids:
        docs_resp = (
            client.table("documents")
            .select("id, file_name, file_type, total_pages, storage_path")
            .eq("status", "indexed")
            .eq("is_active", True)
            .in_("id", chunk_doc_ids)
            .limit(20)
            .execute()
        )
        for d in (docs_resp.data or []):
            doc_id = str(d["id"])
            if doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)
            file_url = get_signed_file_url(d["storage_path"]) if d.get("storage_path") else ""
            results.append(DocumentSearchResult(
                id=doc_id,
                file_name=d["file_name"],
                file_url=file_url,
                file_type=d["file_type"],
                total_pages=d.get("total_pages", 0),
            ))

    return results[:20]


# ── PDF Proxy (bypass Supabase iframe restrictions) ─────
@router.get("/{doc_id}/view")
async def view_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Proxy a document's PDF from Supabase Storage with iframe-safe headers."""
    client = get_supabase_client()

    doc = client.table("documents").select("storage_path, file_name, file_type").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    storage_path = doc.data["storage_path"]
    file_name = doc.data["file_name"]

    try:
        file_bytes = client.storage.from_("documents").download(storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")

    media_type = "application/pdf" if doc.data["file_type"] == "pdf" else "application/octet-stream"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={
            "Content-Disposition": f'inline; filename="{file_name}"',
            "X-Frame-Options": "SAMEORIGIN",
            "Cache-Control": "public, max-age=1800",
        },
    )

# ── Page Image Preview ─────────────────────────────────
@router.get("/{doc_id}/page/{page_number}/image")
async def get_page_image(
    doc_id: str,
    page_number: int,
    current_user: dict = Depends(get_current_user),
):
    """Render a specific page of a PDF document as a JPEG image."""
    client = get_authenticated_client(current_user["access_token"])

    doc = client.table("documents").select("storage_path, file_type").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.data["file_type"] != "pdf":
        raise HTTPException(status_code=400, detail="Page preview is only available for PDF documents.")

    storage_path = doc.data["storage_path"]
    try:
        file_bytes = client.storage.from_("documents").download(storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")

    try:
        import fitz
        pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")

        if page_number < 1 or page_number > len(pdf_doc):
            raise HTTPException(
                status_code=400,
                detail=f"Page {page_number} out of range. Document has {len(pdf_doc)} pages."
            )

        page = pdf_doc[page_number - 1]
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
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


# ── Stats (put BEFORE /{doc_id} routes to avoid path conflicts) ──
@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get document management statistics."""
    client = get_authenticated_client(current_user["access_token"])

    total_resp = client.table("documents").select("id", count="exact").execute()
    total = total_resp.count or 0

    pages_resp = client.table("documents").select("total_pages").eq("status", "indexed").execute()
    indexed_pages = sum(d["total_pages"] for d in (pages_resp.data or []))

    active_resp = client.table("documents").select("id", count="exact").eq("is_active", True).execute()
    active_count = active_resp.count or 0
    active_pct = (active_count / total * 100) if total > 0 else 0

    size_resp = client.table("documents").select("file_size").execute()
    storage_bytes = sum(d["file_size"] for d in (size_resp.data or []))

    return StatsResponse(
        total_documents=total,
        indexed_pages=indexed_pages,
        active_percentage=round(active_pct, 1),
        storage_used_bytes=storage_bytes,
    )


# ── List Documents ─────────────────────────────────────
@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = 1,
    per_page: int = 50,
    status: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """List all documents with optional status filter and pagination."""
    client = get_authenticated_client(current_user["access_token"])
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
            total_pages=d.get("total_pages", 0),
        )
        for d in (response.data or [])
    ]

    return DocumentListResponse(
        documents=documents,
        total=response.count or 0,
        page=page,
        per_page=per_page,
    )


# ── Upload Document ────────────────────────────────────
@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    admin_user: dict = Depends(require_admin),
):
    """Upload a document to Supabase Storage and create a metadata record."""
    file_ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "unknown"
    if file_ext not in ("pdf", "docx", "txt"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, or TXT.")

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 25MB limit.")

    client = get_authenticated_client(admin_user["access_token"])

    # Upload to Supabase Storage
    storage_path = f"uploads/{uuid.uuid4()}/{file.filename}"
    client.storage.from_("documents").upload(storage_path, file_bytes)

    # Get page count for PDFs
    total_pages = 0
    if file_ext == "pdf":
        total_pages = get_total_pages(file_bytes)

    # Get public URL
    file_url = client.storage.from_("documents").get_public_url(storage_path)

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

    # Start background processing (uses base client since no user context)
    background_tasks.add_task(process_document, doc_id, file_bytes, file_ext, file_url)

    return DocumentUploadResponse(
        id=str(doc_id),
        file_name=file.filename or "unknown",
        status="pending",
        message="Document uploaded. Processing will begin shortly.",
    )


# ── Background Processing ─────────────────────────────
async def process_document(doc_id: str, file_bytes: bytes, file_ext: str, file_url: str = ""):
    """Background task: parse document → generate embeddings → store in pgvector."""
    # Background tasks use the base client (no user context available)
    client = get_supabase_client()

    try:
        client.table("documents").update({"status": "syncing"}).eq("id", doc_id).execute()

        # Fetch the filename for metadata injection
        doc_meta = client.table("documents").select("file_name").eq("id", doc_id).single().execute()
        file_name = doc_meta.data.get("file_name", "Unknown") if doc_meta.data else "Unknown"

        if file_ext == "pdf":
            chunks = parse_pdf(file_bytes, file_name=file_name, file_url=file_url)
        else:
            text = file_bytes.decode("utf-8", errors="ignore")
            from models.schemas import ChunkData, BoundingBox
            chunks = [ChunkData(
                text=text,
                page_number=1,
                bbox=BoundingBox(x=0, y=0, width=0, height=0),
                chunk_index=0,
                metadata={"file_name": file_name, "page_number": 1, "file_url": file_url}
            )]

        total_pages = max((c.page_number for c in chunks), default=0) if chunks else 0
        if total_pages > 0:
            client.table("documents").update({"total_pages": total_pages}).eq("id", doc_id).execute()

        if not chunks:
            client.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()
            return

        # Prepend filename to each chunk's text BEFORE embedding
        # This ensures filename keywords (e.g. "PERDIR") are searchable via vector similarity
        texts_for_embedding = [
            f"Dokumen Sumber: {file_name}\n\nKonten:\n{c.text}" for c in chunks
        ]
        embeddings = embed_texts(texts_for_embedding)

        chunk_dicts = [
            {
                "text": c.text,
                "page_number": c.page_number,
                "bbox": {"x": c.bbox.x, "y": c.bbox.y, "width": c.bbox.width, "height": c.bbox.height},
                "chunk_index": c.chunk_index,
                "metadata": c.metadata,
            }
            for c in chunks
        ]
        store_embeddings_in_supabase(doc_id, chunk_dicts, embeddings)

        client.table("documents").update({"status": "indexed"}).eq("id", doc_id).execute()

    except Exception as e:
        print(f"Error processing document {doc_id}: {e}")
        client.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()


# ── Sync Document (re-process) ─────────────────────────
@router.post("/{doc_id}/sync", response_model=DocumentSyncResponse)
async def sync_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(require_admin),
):
    """Re-process a document: delete existing chunks, re-parse and re-embed."""
    client = get_authenticated_client(admin_user["access_token"])

    doc = client.table("documents").select("*").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    client.table("document_chunks").delete().eq("document_id", doc_id).execute()

    storage_path = doc.data["storage_path"]
    file_bytes = client.storage.from_("documents").download(storage_path)
    file_url = client.storage.from_("documents").get_public_url(storage_path)

    background_tasks.add_task(process_document, doc_id, file_bytes, doc.data["file_type"], file_url)

    return DocumentSyncResponse(
        id=doc_id,
        status="syncing",
        chunks_processed=0,
        message="Document re-sync started.",
    )


# ── Toggle Document Status ────────────────────────────
@router.patch("/{doc_id}/toggle")
async def toggle_document_status(
    doc_id: str,
    admin_user: dict = Depends(require_admin),
):
    """Toggle the active status of a document."""
    client = get_authenticated_client(admin_user["access_token"])

    doc = client.table("documents").select("is_active").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    new_status = not doc.data["is_active"]
    client.table("documents").update({"is_active": new_status}).eq("id", doc_id).execute()

    return {"id": doc_id, "is_active": new_status}


# ── Delete Document ────────────────────────────────────
@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    admin_user: dict = Depends(require_admin),
):
    """Delete a document and its chunks from DB and Storage."""
    client = get_authenticated_client(admin_user["access_token"])

    doc = client.table("documents").select("storage_path").eq("id", doc_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.data.get("storage_path"):
        try:
            client.storage.from_("documents").remove([doc.data["storage_path"]])
        except Exception:
            pass

    client.table("document_chunks").delete().eq("document_id", doc_id).execute()
    client.table("documents").delete().eq("id", doc_id).execute()

    return {"message": "Document deleted successfully."}
