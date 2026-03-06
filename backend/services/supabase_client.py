"""
AKSARA RSCM — Supabase Client Wrapper
Provides a configured Supabase client instance for database and storage operations.
Uses the service role key to bypass RLS for server-side operations.
"""

from supabase import create_client, Client
from config import settings

_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client using the service role key."""
    global _client
    if _client is None:
        _client = create_client(
            settings.SUPABASE_URL,
            settings.effective_service_key,
        )
    return _client


# Backward-compatible alias used in auth_service and other modules
supabase = get_supabase_client
