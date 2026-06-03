-- ============================================================
-- AKSARA RSCM — Document Classifications Migration
-- Tabel untuk menyimpan jenis referensi / klasifikasi dokumen
-- ============================================================

-- 1. Create document_classifications table
CREATE TABLE IF NOT EXISTS public.document_classifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Updated_at trigger
CREATE TRIGGER trigger_document_classifications_updated_at
    BEFORE UPDATE ON public.document_classifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Row Level Security
ALTER TABLE public.document_classifications ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read classifications
CREATE POLICY "Authenticated users can read classifications"
ON public.document_classifications FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert classifications
CREATE POLICY "Authenticated users can insert classifications"
ON public.document_classifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update classifications
CREATE POLICY "Authenticated users can update classifications"
ON public.document_classifications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete classifications
CREATE POLICY "Authenticated users can delete classifications"
ON public.document_classifications FOR DELETE
TO authenticated
USING (true);

-- 4. Seed initial data
INSERT INTO public.document_classifications (name, description) VALUES
    ('Dokumen kebijakan', 'Perdir, SPO, surat keputusan, pedoman internal'),
    ('Dokumen operasional', 'Alur layanan, panduan unit kerja, prosedur administrasi'),
    ('Dokumen strategis', 'Renstra, program transformasi, rencana pengembangan'),
    ('Dokumen teknis', 'Panduan aplikasi, dokumentasi sistem, alur integrasi')
ON CONFLICT (name) DO NOTHING;
