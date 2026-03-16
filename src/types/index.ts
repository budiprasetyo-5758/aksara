// ── Chat Types ──────────────────────────────────────────
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SourceReference[];
  isLoading?: boolean;
}

export interface SourceReference {
  document_id: string;
  file_name: string;
  page_number: number;
  bbox: BoundingBox;
  snippet: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ── Document / Admin Types ──────────────────────────────
export type DocumentStatus = 'pending' | 'syncing' | 'indexed' | 'failed';

export interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: 'pdf' | 'docx' | 'txt';
  upload_date: string;
  status: DocumentStatus;
  is_active: boolean;
  total_pages: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  embedding: number[];
  created_at: string;
}

export interface StatsData {
  totalDocuments: number;
  indexedPages: string;
  activeStatus: string;
  storageUsed: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: string;
}
