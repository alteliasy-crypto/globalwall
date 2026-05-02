CREATE OR REPLACE FUNCTION public.purchase_market_item(_item_key text)
RETURNS TABLE(success boolean, message text, coins integer, tokens integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  catalog jsonb := '{
    "theme_neon":      {"type":"cosmetic","coins":400,"tokens":0,"label":"Neon Pulse Theme"},
    "theme_pastel":    {"type":"cosmetic","coins":400,"tokens":0,"label":"Pastel Dream Theme"},
    "badge_gold":      {"type":"cosmetic","coins":600,"tokens":1,"label":"Gold Wall Badge"},
    "badge_diamond":   {"type":"cosmetic","coins":0,"tokens":5,"label":"Diamond Wall Badge"},
    "fx_confetti":     {"type":"cosmetic","coins":300,"tokens":0,"label":"Confetti Pin Effect"},
    "fx_sparkle":      {"type":"cosmetic","coins":250,"tokens":0,"label":"Sparkle Pin Effect"},
    "boost_2x_30m":    {"type":"boost","coins":250,"tokens":0,"mult":2.0,"minutes":30,"label":"2x Coins (30 min)"},
    "boost_3x_15m":    {"type":"boost","coins":0,"tokens":2,"mult":3.0,"minutes":15,"label":"3x Coins (15 min)"},
    "streak_shield":   {"type":"boost","coins":150,"tokens":0,"mult":1.0,"minutes":120,"label":"Streak Shield (2h)"}
  }'::jsonb;
  item jsonb;
  c_cost int;
  t_cost int;
  cur_coins int;
  cur_tokens int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  item := catalog -> _item_key;
  IF item IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown item', 0, 0;
    RETURN;
  END IF;

  SELECT uc.coins, uc.tokens INTO cur_coins, cur_tokens
    FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

  IF item->>'type' = 'cosmetic' AND EXISTS (
    SELECT 1 FROM public.cosmetics_owned co WHERE co.user_id = uid AND co.item_key = _item_key
  ) THEN
    RETURN QUERY SELECT false, 'Already owned', cur_coins, cur_tokens;
    RETURN;
  END IF;

  c_cost := (item->>'coins')::int;
  t_cost := (item->>'tokens')::int;

  IF cur_coins < c_cost OR cur_tokens < t_cost THEN
    RETURN QUERY SELECT false, 'Not enough currency', cur_coins, cur_tokens;
    RETURN;
  END IF;

  UPDATE public.user_currency uc
  SET coins = uc.coins - c_cost,
      tokens = uc.tokens - t_cost,
      updated_at = now()
  WHERE uc.user_id = uid
  RETURNING uc.coins, uc.tokens INTO cur_coins, cur_tokens;

  IF item->>'type' = 'cosmetic' THEN
    INSERT INTO public.cosmetics_owned (user_id, item_key)
    VALUES (uid, _item_key);
  ELSE
    INSERT INTO public.active_boosts (user_id, boost_key, multiplier, expires_at)
    VALUES (uid, _item_key, (item->>'mult')::numeric, now() + ((item->>'minutes')::int || ' minutes')::interval);
  END IF;

  RETURN QUERY SELECT true, 'Purchased: ' || (item->>'label'), cur_coins, cur_tokens;
END;
$function$;