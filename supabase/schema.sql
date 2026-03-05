-- ============================================================
-- AKSARA RSCM — Supabase Database Schema
-- Run this migration in: Supabase SQL Editor → New Query
-- ============================================================

-- 1. Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Create custom enum for document processing status
CREATE TYPE document_status AS ENUM ('pending', 'syncing', 'indexed', 'failed');

-- 3. Documents table (stores metadata for uploaded files)
CREATE TABLE public.documents (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name       TEXT NOT NULL,
    file_path       TEXT,
    file_size       BIGINT NOT NULL DEFAULT 0,
    file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
    upload_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          document_status NOT NULL DEFAULT 'pending',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    total_pages     INTEGER NOT NULL DEFAULT 0,
    storage_path    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Document chunks table (stores text chunks with embeddings)
--    bge-m3 produces 1024-dimensional vectors
CREATE TABLE public.document_chunks (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id     UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    page_number     INTEGER NOT NULL,
    bbox_x          REAL NOT NULL DEFAULT 0,
    bbox_y          REAL NOT NULL DEFAULT 0,
    bbox_width      REAL NOT NULL DEFAULT 0,
    bbox_height     REAL NOT NULL DEFAULT 0,
    embedding       vector(1024),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (document_id, chunk_index)
);

-- 5. Create HNSW index for fast cosine similarity search
CREATE INDEX idx_document_chunks_embedding
ON public.document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Index on document_id for fast lookups
CREATE INDEX idx_document_chunks_document_id
ON public.document_chunks (document_id);

-- 7. Index on status for filtering
CREATE INDEX idx_documents_status
ON public.documents (status);

-- 8. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all documents
CREATE POLICY "Authenticated users can read documents"
ON public.documents FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert documents
CREATE POLICY "Authenticated users can insert documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update documents
CREATE POLICY "Authenticated users can update documents"
ON public.documents FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete documents
CREATE POLICY "Authenticated users can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (true);

-- Policy: Authenticated users can read chunks
CREATE POLICY "Authenticated users can read chunks"
ON public.document_chunks FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert chunks
CREATE POLICY "Authenticated users can insert chunks"
ON public.document_chunks FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can delete chunks
CREATE POLICY "Authenticated users can delete chunks"
ON public.document_chunks FOR DELETE
TO authenticated
USING (true);

-- 10. Supabase Storage bucket for raw PDF files
-- Run in Supabase Dashboard → Storage → Create bucket named "documents"
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 11. RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1024),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    page_number INTEGER,
    bbox_x REAL,
    bbox_y REAL,
    bbox_width REAL,
    bbox_height REAL,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.page_number,
        dc.bbox_x,
        dc.bbox_y,
        dc.bbox_width,
        dc.bbox_height,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    JOIN public.documents d ON dc.document_id = d.id
    WHERE d.is_active = true
      AND d.status = 'indexed'
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
