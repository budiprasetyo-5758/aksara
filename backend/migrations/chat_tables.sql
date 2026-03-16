-- ============================================================
-- AKSARA — Chat Tables and RLS Policies
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 1. Users can manage their OWN sessions
CREATE POLICY "Users can manage own sessions"
  ON public.chat_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Users can manage messages in their OWN sessions
CREATE POLICY "Users can manage own messages"
  ON public.chat_messages
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- 3. Allow service operations (anon key) for background inserts (from backend /api/chat endpoint)
CREATE POLICY "Service can insert sessions"
  ON public.chat_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service can update sessions"
  ON public.chat_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
  
CREATE POLICY "Service can select sessions"
  ON public.chat_sessions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service can insert messages"
  ON public.chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service can update messages"
  ON public.chat_messages
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
  
CREATE POLICY "Service can select messages"
  ON public.chat_messages
  FOR SELECT
  TO anon
  USING (true);
