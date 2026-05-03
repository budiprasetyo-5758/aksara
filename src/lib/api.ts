/**
 * AKSARA — API Service Layer
 * Centralized functions for all FastAPI backend calls.
 */

import { supabase } from './supabase';
import type { SourceReference, Document, DocumentSearchResult } from '@/types';

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
  documentId?: string,
): Promise<ChatApiResponse> {
  const body: Record<string, string> = { message, session_id: sessionId };
  if (documentId) body.document_id = documentId;

  const response = await authFetch('/api/chat/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json();
}

/**
 * Streaming chat via SSE. Calls onToken for each received token,
 * onSources when sources metadata arrives, and returns the full response.
 */
export async function sendChatMessageStream(
  message: string,
  sessionId: string,
  onToken: (token: string) => void,
  onSources?: (sources: SourceReference[], sessionId: string | null) => void,
  documentId?: string,
): Promise<ChatApiResponse> {
  const token = await getAuthToken();
  const body: Record<string, string> = { message, session_id: sessionId };
  if (documentId) body.document_id = documentId;

  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullAnswer = '';
  let sources: SourceReference[] = [];
  let returnedSessionId: string | null = sessionId;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines: each event is "data: {...}\n\n"
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));

        // Sources metadata event (sent first)
        if (data.sources !== undefined) {
          sources = data.sources || [];
          returnedSessionId = data.session_id || sessionId;
          if (onSources) onSources(sources, returnedSessionId);
          continue;
        }

        // Token event
        if (data.token) {
          fullAnswer += data.token;
          onToken(data.token);
          continue;
        }

        // Done event with full answer
        if (data.done) {
          if (data.full_answer) fullAnswer = data.full_answer;
          continue;
        }

        // Error event
        if (data.error) {
          throw new Error(data.error);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // Skip malformed JSON
        throw e;
      }
    }
  }

  return {
    answer: fullAnswer,
    sources,
    session_id: returnedSessionId,
  };
}

// ── Document Search ───────────────────────────────────

export async function searchDocuments(query: string): Promise<DocumentSearchResult[]> {
  const response = await authFetch(`/api/documents/search?q=${encodeURIComponent(query)}`);
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
