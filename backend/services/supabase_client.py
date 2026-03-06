"""
AKSARA RSCM — Supabase Client Wrapper

Two clients:
  1. get_supabase_client() — base client with anon key (for unauthenticated/server ops)
  2. get_authenticated_client(token) — client with user's JWT set as auth header
     → Makes RLS evaluate under the 'authenticated' role
"""

from supabase import create_client, Client
from config import settings

import supabase._sync.client
import re

# Monkey-patch the strict JWT regex check in the Supabase Python SDK.
# Instead of replacing re.match globally, we replace the specific `re` module reference inside supabase client.
class DummyRE:
    @staticmethod
    def match(*args, **kwargs):
        return True

supabase._sync.client.re = DummyRE

_client: Client | None = None

def get_supabase_client() -> Client:
    """
    Return a singleton base Supabase client using the service key.
    Use this for operations that need to bypass RLS (e.g., background tasks).
    """
    global _client
    if _client is None:
        api_key = settings.effective_service_key
        _client = create_client(settings.SUPABASE_URL, api_key)
    return _client


def get_authenticated_client(access_token: str) -> Client:
    """
    Create a Supabase client authenticated with the user's JWT.
    This makes RLS evaluate under the 'authenticated' role,
    allowing policies like 'Authenticated users can read documents' to pass.
    """
    api_key = settings.SUPABASE_ANON_KEY
    if not api_key:
        api_key = settings.SUPABASE_SERVICE_KEY

    client = create_client(settings.SUPABASE_URL, api_key)
    client.postgrest.auth(access_token)
    return client


# Backward-compatible alias
supabase = get_supabase_client
