
-- 1. Drop the SECURITY DEFINER view (replaced by get_nicknames RPC already created)
DROP VIEW IF EXISTS public.public_users;
DROP FUNCTION IF EXISTS public.get_public_users();

-- 2. Restrict users UPDATE to nickname column only
DROP POLICY IF EXISTS "Users can update their own nickname" ON public.users;

CREATE POLICY "Users can update their own nickname"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_banned IS NOT DISTINCT FROM (SELECT u.is_banned FROM public.users u WHERE u.id = auth.uid())
  AND warnings IS NOT DISTINCT FROM (SELECT u.warnings FROM public.users u WHERE u.id = auth.uid())
);

-- 3. Scope realtime subscriptions to a single shared "wall" topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Wall channel read" ON realtime.messages;
DROP POLICY IF EXISTS "Wall channel write" ON realtime.messages;

CREATE POLICY "Wall channel read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() = 'wall');

CREATE POLICY "Wall channel write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() = 'wall');
