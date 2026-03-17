-- ============================================================
-- AKSARA — Scoped Vector Search RPC
-- Filters similarity search to a specific document by file_url
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION match_document_chunks_scoped(
    query_embedding vector(1024),
    filter_file_url TEXT,
    match_threshold FLOAT DEFAULT 0.3,
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
    metadata JSONB,
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
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    JOIN public.documents d ON dc.document_id = d.id
    WHERE d.is_active = true
      AND d.status = 'indexed'
      AND dc.metadata->>'file_url' = filter_file_url
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
