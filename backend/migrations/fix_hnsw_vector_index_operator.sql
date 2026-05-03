-- ============================================================
-- AKSARA — Fix HNSW Vector Index Operator Mismatch
-- 
-- ISSUE: The existing index used vector_ip_ops (inner product)
--        but all RPC functions use <=> (cosine distance = vector_cosine_ops).
--        This caused PostgreSQL to IGNORE the index entirely,
--        resulting in sequential scans on every vector search.
--
-- APPLIED: Via Supabase MCP apply_migration (2026-05-02)
-- ============================================================

DROP INDEX IF EXISTS document_chunks_embedding_idx;

CREATE INDEX document_chunks_embedding_idx 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
