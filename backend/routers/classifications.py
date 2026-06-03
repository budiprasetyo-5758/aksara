"""
AKSARA RSCM — Document Classifications Router
CRUD endpoints for managing document classification types (Jenis Referensi).
"""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import (
    ClassificationOut,
    ClassificationCreate,
    ClassificationUpdate,
)
from services.supabase_client import get_authenticated_client
from services.auth_service import require_admin, get_current_user

router = APIRouter(prefix="/api/classifications", tags=["Classifications"])


# ── List Classifications ───────────────────────────────
@router.get("/", response_model=list[ClassificationOut])
async def list_classifications(
    current_user: dict = Depends(get_current_user),
):
    """List all document classifications."""
    client = get_authenticated_client(current_user["access_token"])

    response = (
        client.table("document_classifications")
        .select("*")
        .order("created_at", desc=False)
        .execute()
    )

    return [
        ClassificationOut(
            id=str(c["id"]),
            name=c["name"],
            description=c.get("description"),
            created_at=str(c["created_at"]),
            updated_at=str(c["updated_at"]),
        )
        for c in (response.data or [])
    ]


# ── Create Classification ──────────────────────────────
@router.post("/", response_model=ClassificationOut, status_code=201)
async def create_classification(
    body: ClassificationCreate,
    admin_user: dict = Depends(require_admin),
):
    """Create a new document classification (admin only)."""
    client = get_authenticated_client(admin_user["access_token"])

    # Check for duplicate name
    existing = (
        client.table("document_classifications")
        .select("id")
        .eq("name", body.name)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail=f"Classification '{body.name}' already exists.",
        )

    data = {"name": body.name}
    if body.description is not None:
        data["description"] = body.description

    result = client.table("document_classifications").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create classification.")

    c = result.data[0]
    return ClassificationOut(
        id=str(c["id"]),
        name=c["name"],
        description=c.get("description"),
        created_at=str(c["created_at"]),
        updated_at=str(c["updated_at"]),
    )


# ── Update Classification ──────────────────────────────
@router.put("/{classification_id}", response_model=ClassificationOut)
async def update_classification(
    classification_id: str,
    body: ClassificationUpdate,
    admin_user: dict = Depends(require_admin),
):
    """Update an existing document classification (admin only)."""
    client = get_authenticated_client(admin_user["access_token"])

    # Check exists
    existing = (
        client.table("document_classifications")
        .select("id")
        .eq("id", classification_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Classification not found.")

    update_data = {}
    if body.name is not None:
        # Check for duplicate name (exclude current)
        dup = (
            client.table("document_classifications")
            .select("id")
            .eq("name", body.name)
            .neq("id", classification_id)
            .execute()
        )
        if dup.data:
            raise HTTPException(
                status_code=409,
                detail=f"Classification '{body.name}' already exists.",
            )
        update_data["name"] = body.name
    if body.description is not None:
        update_data["description"] = body.description

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    result = (
        client.table("document_classifications")
        .update(update_data)
        .eq("id", classification_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update classification.")

    c = result.data[0]
    return ClassificationOut(
        id=str(c["id"]),
        name=c["name"],
        description=c.get("description"),
        created_at=str(c["created_at"]),
        updated_at=str(c["updated_at"]),
    )


# ── Delete Classification ──────────────────────────────
@router.delete("/{classification_id}")
async def delete_classification(
    classification_id: str,
    admin_user: dict = Depends(require_admin),
):
    """Delete a document classification (admin only)."""
    client = get_authenticated_client(admin_user["access_token"])

    existing = (
        client.table("document_classifications")
        .select("id")
        .eq("id", classification_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Classification not found.")

    client.table("document_classifications").delete().eq(
        "id", classification_id
    ).execute()

    return {"message": "Classification deleted successfully."}
