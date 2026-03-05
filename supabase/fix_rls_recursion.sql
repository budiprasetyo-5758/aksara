-- ============================================================
-- FIX: Infinite recursion in RLS policies for profiles table
-- ============================================================

-- Step 1: Create a SECURITY DEFINER function to check admin role
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop ALL existing policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Step 3: Recreate profiles policies using the SECURITY DEFINER function
-- Combined policy: users read own profile OR admin reads all

-- Admins can read ALL profiles (for User Management page)
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- Admins can update any profile's role
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    public.is_admin()
  );

-- Step 4: Also fix the document/chunk policies to use the function
DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

CREATE POLICY "Admins can insert documents" ON public.documents
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update documents" ON public.documents
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete documents" ON public.documents
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Admins can update chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Admins can delete chunks" ON public.document_chunks;

CREATE POLICY "Admins can insert chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update chunks" ON public.document_chunks
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete chunks" ON public.document_chunks
  FOR DELETE USING (public.is_admin());

-- Step 5: Update the user's role to admin
UPDATE public.profiles SET role = 'admin' WHERE id = 'c276d135-4fbd-4064-bdb1-3572bb99858e';
