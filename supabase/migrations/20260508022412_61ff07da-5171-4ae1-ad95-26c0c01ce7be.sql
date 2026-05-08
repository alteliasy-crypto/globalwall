CREATE OR REPLACE FUNCTION public.get_shop_rotation()
 RETURNS TABLE(item_key text, category text, type text, label text, description text, coins integer, tokens integer, rarity text, accent text, meta jsonb, rotates_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bucket bigint := floor(extract(epoch from now()) / 21600);
  next_rotate timestamptz := to_timestamp((v_bucket + 1) * 21600);
BEGIN
  RETURN QUERY
  WITH weighted AS (
    SELECT s.*,
      CASE s.rarity WHEN 'common' THEN 60 WHEN 'rare' THEN 25 WHEN 'epic' THEN 10 WHEN 'legendary' THEN 5 ELSE 30 END AS w
    FROM public.shop_catalog s
  ),
  scored AS (
    SELECT *,
      ('x' || substr(md5(item_key || v_bucket::text), 1, 8))::bit(32)::int / GREATEST(w, 1)::numeric AS score
    FROM weighted
  )
  SELECT s.item_key, s.category, s.type, s.label, s.description,
         s.coins, s.tokens, s.rarity, s.accent, s.meta, next_rotate
  FROM scored s
  ORDER BY s.score
  LIMIT 25;
END;
$function$;