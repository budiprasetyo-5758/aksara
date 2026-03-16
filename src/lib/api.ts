/**
 * AKSARA — API Service Layer
 * Centralized functions for all FastAPI backend calls.
 */

import { supabase } from './supabase';
import type { SourceReference, Document } from '@/types';

// In development, Vite proxy forwards /api/* to the backend (see vite.config.ts).
// In production, set VITE_API_URL to the backend URL.
const API_BASE = import.meta.env.VITE_API_URL || '';

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

  // Handle 204 No Content gracefully without attempting to parse JSON
  if (response.status === 204) {
    return response;
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

export function uploadDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  id: string;
  file_name: string;
  status: string;
  message: string;
}> {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/documents/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Cap upload progress at 90% until the server actually responds
            const percent = Math.round((event.loaded / event.total) * 90);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (onProgress) onProgress(100);
            resolve(result);
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.detail || `Upload error: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload error: ${xhr.status} ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error or CORS issue during upload'));
      };

      xhr.send(formData);
    } catch (err) {
      reject(err);
    }
  });
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

// ── Sessions ──────────────────────────────────────────

import type { ChatSession, ChatMessage } from '@/types';

export async function fetchSessions(): Promise<ChatSession[]> {
  const response = await authFetch('/api/sessions/');
  return response.json();
}

export async function createSession(title: string = 'New Chat'): Promise<ChatSession> {
  const response = await authFetch('/api/sessions/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await authFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function renameSession(sessionId: string, title: string): Promise<ChatSession> {
  const response = await authFetch(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return response.json();
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await authFetch(`/api/sessions/${sessionId}/messages`);
  return response.json();
}

export async function sendChatMessageMultimodal(
  message: string,
  sessionId: string,
  file: File,
): Promise<ChatApiResponse> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('message', message);
  formData.append('session_id', sessionId);
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/chat/multimodal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  return response.json();
}
