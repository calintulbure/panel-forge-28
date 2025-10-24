-- Fix critical security issue: chat_messages exposed to unauthenticated users
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view messages" ON chat_messages;

-- Create authenticated-only policy
CREATE POLICY "Authenticated users can view messages"
ON chat_messages FOR SELECT
USING (auth.uid() IS NOT NULL);