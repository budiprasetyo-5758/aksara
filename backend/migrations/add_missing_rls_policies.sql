-- ============================================================
-- AKSARA — Missing RLS Policies
-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/rhglrrcjsymrvbkcywgj/sql)
-- ============================================================

-- 1. Users can read their OWN profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Allow service operations on documents (for background processing)
-- The backend's background tasks run with the anon key and need to update document status
CREATE POLICY "Service can update documents"
  ON public.documents
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can read documents"
  ON public.documents
  FOR SELECT
  TO anon
  USING (true);

-- 3. Allow service operations on document_chunks (for embedding storage)
CREATE POLICY "Service can insert chunks"
  ON public.document_chunks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service can update chunks"
  ON public.document_chunks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can delete chunks"
  ON public.document_chunks
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Service can read chunks"
  ON public.document_chunks
  FOR SELECT
  TO anon
  USING (true);

-- 4. Allow authenticated users to insert into documents (for uploads via authenticated client)
-- (Only if not already covered by existing "Authenticated users can insert documents" policy)

-- 5. Allow anon to insert documents (for background task fallback)  
CREATE POLICY "Service can insert documents"
  ON public.documents
  FOR INSERT
  TO anon
  WITH CHECK (true);
