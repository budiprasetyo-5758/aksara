/**
 * AKSARA — API Service Layer
 * Centralized functions for all FastAPI backend calls.
 */

import { supabase } from './supabase';
import type { SourceReference, Document } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Helper to get the current auth token from Supabase session */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in.');
  }
  return session.access_token;
}

/** Helper for authenticated fetch */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  return response;
}

// ── Chat ──────────────────────────────────────────────

export interface ChatApiResponse {
  answer: string;
  sources: SourceReference[];
  session_id: string | null;
}

export async function sendChatMessage(
  message: string,
  sessionId: string,
): Promise<ChatApiResponse> {
  const response = await authFetch('/api/chat/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  return response.json();
}

// ── Documents ─────────────────────────────────────────

export interface DocumentListApiResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
}

export async function fetchDocuments(
  page: number = 1,
  perPage: number = 50,
  status?: string,
): Promise<DocumentListApiResponse> {
  let url = `/api/documents/?page=${page}&per_page=${perPage}`;
  if (status) url += `&status=${status}`;

  const response = await authFetch(url);
  return response.json();
}

export async function uploadDocument(file: File): Promise<{
  id: string;
  file_name: string;
  status: string;
  message: string;
}> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Upload error: ${response.status}`);
  }

  return response.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  await authFetch(`/api/documents/${docId}`, { method: 'DELETE' });
}

export async function toggleDocumentStatus(docId: string): Promise<{ id: string; is_active: boolean }> {
  const response = await authFetch(`/api/documents/${docId}/toggle`, { method: 'PATCH' });
  return response.json();
}

export async function syncDocument(docId: string): Promise<void> {
  await authFetch(`/api/documents/${docId}/sync`, { method: 'POST' });
}

// ── Stats ─────────────────────────────────────────────

export interface StatsApiResponse {
  total_documents: number;
  indexed_pages: number;
  active_percentage: number;
  storage_used_bytes: number;
}

export async function fetchStats(): Promise<StatsApiResponse> {
  const response = await authFetch('/api/documents/stats');
  return response.json();
}
