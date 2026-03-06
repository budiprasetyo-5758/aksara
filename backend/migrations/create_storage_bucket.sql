-- ============================================================
-- AKSARA — Missing Storage Bucket & Policies
-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/rhglrrcjsymrvbkcywgj/sql)
-- ============================================================

-- 1. Create the storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  26214400, -- 25MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- Allow service (anon background tasks) to read documents
CREATE POLICY "Anon service can read documents"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'documents');

-- Allow service (anon background tasks) to delete documents
CREATE POLICY "Anon service can delete documents"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'documents');

-- Allow service (anon background tasks) to upload documents
CREATE POLICY "Anon service can upload documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'documents');
