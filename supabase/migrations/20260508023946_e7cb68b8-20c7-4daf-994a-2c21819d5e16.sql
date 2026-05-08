CREATE OR REPLACE FUNCTION public.get_shop_rotation()
 RETURNS TABLE(item_key text, category text, type text, label text, description text, coins integer, tokens integer, rarity text, accent text, meta jsonb, rotates_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bucket bigint := floor(extract(epoch from now()) / 21600);
  v_next timestamptz := to_timestamp((v_bucket + 1) * 21600);
BEGIN
  RETURN QUERY
  WITH weighted AS (
    SELECT s.item_key AS k, s.category AS cat, s.type AS typ, s.label AS lbl, s.description AS descr,
           s.coins AS c, s.tokens AS tk, s.rarity AS rar, s.accent AS acc, s.meta AS m,
      CASE s.rarity WHEN 'common' THEN 60 WHEN 'rare' THEN 25 WHEN 'epic' THEN 10 WHEN 'legendary' THEN 5 ELSE 30 END AS w
    FROM public.shop_catalog s
  ),
  scored AS (
    SELECT w.*,
      ('x' || substr(md5(w.k || v_bucket::text), 1, 8))::bit(32)::int / GREATEST(w.w, 1)::numeric AS score
    FROM weighted w
  )
  SELECT s.k, s.cat, s.typ, s.lbl, s.descr, s.c, s.tk, s.rar, s.acc, s.m, v_next
  FROM scored s
  ORDER BY s.score
  LIMIT 25;
END;
$function$;