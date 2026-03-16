-- Run this in your Supabase SQL Editor
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS metadata JSONB;
