CREATE OR REPLACE FUNCTION public.get_nicknames(ids uuid[])
RETURNS TABLE (id uuid, nickname text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nickname
  FROM public.users u
  WHERE u.id = ANY(ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_nicknames(uuid[]) TO anon, authenticated;