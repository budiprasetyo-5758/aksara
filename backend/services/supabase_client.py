"""
AKSARA RSCM — Supabase Client Wrapper
Provides a configured Supabase client instance for database and storage operations.
"""

from supabase import create_client, Client
from config import settings

_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client."""
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client
