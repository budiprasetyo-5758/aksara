-- ============================================================
-- AKSARA RSCM — Add classification_id to documents table
-- Links documents to their classification (Jenis Referensi)
-- ============================================================

-- 1. Add classification_id column (nullable, ON DELETE SET NULL)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS classification_id UUID REFERENCES public.document_classifications(id) ON DELETE SET NULL;

-- 2. Index for faster filtering by classification
CREATE INDEX IF NOT EXISTS idx_documents_classification_id
ON public.documents (classification_id);
