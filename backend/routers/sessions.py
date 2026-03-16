"""
AKSARA RSCM — Chat Sessions Router
CRUD endpoints for managing chat sessions with user isolation.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from models.schemas import SessionOut, SessionCreateRequest, MessageOut
from services.supabase_client import get_supabase_client
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


# ── List Sessions ──────────────────────────────────────
@router.get("/", response_model=list[SessionOut])
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """List all chat sessions for the authenticated user, newest first."""
    client = get_supabase_client()
    result = (
        client.table("chat_sessions")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return [
        SessionOut(
            id=str(s["id"]),
            user_id=str(s["user_id"]),
            title=s["title"],
            created_at=str(s["created_at"]),
        )
        for s in (result.data or [])
    ]


# ── Create Session ─────────────────────────────────────
@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreateRequest = SessionCreateRequest(),
    current_user: dict = Depends(get_current_user),
):
    """Create a new chat session for the authenticated user."""
    client = get_supabase_client()
    result = (
        client.table("chat_sessions")
        .insert({"user_id": current_user["id"], "title": body.title})
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session.")

    s = result.data[0]
    return SessionOut(
        id=str(s["id"]),
        user_id=str(s["user_id"]),
        title=s["title"],
        created_at=str(s["created_at"]),
    )


# ── Rename Session ─────────────────────────────────────
@router.patch("/{session_id}", response_model=SessionOut)
async def rename_session(
    session_id: str,
    body: SessionCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Rename a chat session — only if it belongs to the current user."""
    client = get_supabase_client()

    # Verify ownership
    check = (
        client.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    result = (
        client.table("chat_sessions")
        .update({"title": body.title})
        .eq("id", session_id)
        .execute()
    )

    s = result.data[0]
    return SessionOut(
        id=str(s["id"]),
        user_id=str(s["user_id"]),
        title=s["title"],
        created_at=str(s["created_at"]),
    )


# ── Delete Session ─────────────────────────────────────
@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a chat session — only if it belongs to the current user."""
    client = get_supabase_client()

    # Verify ownership
    check = (
        client.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    client.table("chat_sessions").delete().eq("id", session_id).execute()
    return None


# ── Get Session Messages ───────────────────────────────
@router.get("/{session_id}/messages", response_model=list[MessageOut])
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch all messages for a session — after verifying user ownership."""
    client = get_supabase_client()

    # Verify ownership
    check = (
        client.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    result = (
        client.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )

    return [
        MessageOut(
            id=str(m["id"]),
            session_id=str(m["session_id"]),
            role=m["role"],
            content=m["content"],
            created_at=str(m["created_at"]),
        )
        for m in (result.data or [])
    ]
