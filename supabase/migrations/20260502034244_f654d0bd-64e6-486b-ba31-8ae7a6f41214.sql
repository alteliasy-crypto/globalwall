-- 1. Fix enforce_note_rules: hourly limit (15 + bonus from quests) instead of hard 3 cap
CREATE OR REPLACE FUNCTION public.enforce_note_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_record public.users%ROWTYPE;
  recent_count INTEGER;
  bonus INTEGER := 0;
  base_hourly CONSTANT INTEGER := 15;
  hourly_cap INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to post notes';
  END IF;
  NEW.user_id := auth.uid();

  SELECT * INTO user_record FROM public.users WHERE id = NEW.user_id;
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'You must register a nickname before posting';
  END IF;

  IF user_record.is_banned THEN
    RAISE EXCEPTION 'You are banned and cannot post notes';
  END IF;

  -- Bonus from completed quests: +1 slot per 2 quests done
  SELECT COALESCE(FLOOR(uc.total_quests_done / 2), 0)::int INTO bonus
    FROM public.user_currency uc WHERE uc.user_id = NEW.user_id;

  hourly_cap := base_hourly + COALESCE(bonus, 0);

  SELECT COUNT(*) INTO recent_count
    FROM public.notes n
    WHERE n.user_id = NEW.user_id
      AND n.created_at > now() - interval '1 hour';

  IF recent_count >= hourly_cap THEN
    RAISE EXCEPTION 'Rate limit reached (% notes/hour). Complete more quests to raise it!', hourly_cap;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Fix purchase_market_item: "coins" / "tokens" ambiguous with OUT params
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
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT DO NOTHING;

  item := catalog -> _item_key;
  IF item IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown item', 0, 0;
    RETURN;
  END IF;

  c_cost := (item->>'coins')::int;
  t_cost := (item->>'tokens')::int;

  SELECT uc.coins, uc.tokens INTO cur_coins, cur_tokens
    FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

  IF cur_coins < c_cost OR cur_tokens < t_cost THEN
    RETURN QUERY SELECT false, 'Not enough currency', cur_coins, cur_tokens;
    RETURN;
  END IF;

  IF item->>'type' = 'cosmetic' THEN
    IF EXISTS (SELECT 1 FROM public.cosmetics_owned co WHERE co.user_id = uid AND co.item_key = _item_key) THEN
      RETURN QUERY SELECT false, 'Already owned', cur_coins, cur_tokens;
      RETURN;
    END IF;
    INSERT INTO public.cosmetics_owned (user_id, item_key) VALUES (uid, _item_key);
  ELSE
    INSERT INTO public.active_boosts (user_id, boost_key, multiplier, expires_at)
    VALUES (uid, _item_key, (item->>'mult')::numeric, now() + ((item->>'minutes')::int || ' minutes')::interval);
  END IF;

  UPDATE public.user_currency uc
  SET coins = uc.coins - c_cost, tokens = uc.tokens - t_cost, updated_at = now()
  WHERE uc.user_id = uid
  RETURNING uc.coins, uc.tokens INTO cur_coins, cur_tokens;

  RETURN QUERY SELECT true, 'Purchased: ' || (item->>'label'), cur_coins, cur_tokens;
END;
$function$;

-- 3. Expand roll_quest: 20 quests, 2 per fire level (1..10)
CREATE OR REPLACE FUNCTION public.roll_quest(_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pool jsonb := '[
    {"key":"post_note","title":"Fresh Pin","desc":"Post a sticky note","base":1,"fire":1},
    {"key":"react_1","title":"First Spark","desc":"React to 1 note","base":1,"fire":1},

    {"key":"colorful_note","title":"Color Bomb","desc":"Post a non-yellow note","base":1,"fire":2},
    {"key":"change_avatar","title":"Face Refresh","desc":"Change your avatar","base":1,"fire":2},

    {"key":"react_3","title":"Spread Vibes","desc":"React to 3 notes","base":3,"fire":3},
    {"key":"favorite_2","title":"Treasure Hunter","desc":"Favorite 2 notes","base":2,"fire":3},

    {"key":"upvote_5","title":"Hype Train","desc":"Upvote 5 notes","base":5,"fire":4},
    {"key":"follow_1","title":"New Friend","desc":"Follow 1 user","base":1,"fire":4},

    {"key":"edit_bio","title":"Main Character","desc":"Set your bio","base":1,"fire":5},
    {"key":"react_10","title":"Reaction Rampage","desc":"React to 10 notes","base":10,"fire":5},

    {"key":"upvote_15","title":"Hype Tornado","desc":"Upvote 15 notes","base":15,"fire":6},
    {"key":"colorful_3","title":"Color Cascade","desc":"Post 3 non-yellow notes","base":3,"fire":6},

    {"key":"favorite_8","title":"Trove Keeper","desc":"Favorite 8 notes","base":8,"fire":7},
    {"key":"follow_3","title":"Wall Socialite","desc":"Follow 3 users","base":3,"fire":7},

    {"key":"react_25","title":"Reaction Inferno","desc":"React to 25 notes","base":25,"fire":8},
    {"key":"post_5_notes","title":"Pin Storm","desc":"Post 5 notes","base":5,"fire":8},

    {"key":"upvote_40","title":"Boost King","desc":"Upvote 40 notes","base":40,"fire":9},
    {"key":"favorite_15","title":"Vault Guardian","desc":"Favorite 15 notes","base":15,"fire":9},

    {"key":"follow_10","title":"Network Tycoon","desc":"Follow 10 users","base":10,"fire":10},
    {"key":"upvote_75","title":"Hype Overlord","desc":"Upvote 75 notes","base":75,"fire":10}
  ]'::jsonb;
  recent_keys text[];
  candidate jsonb;
  picked jsonb;
  fire int;
  coins int;
  tokens int;
BEGIN
  SELECT array_agg(k) INTO recent_keys FROM (
    SELECT q.quest_key AS k
      FROM public.quest_ladder q
      WHERE q.user_id = _uid
    UNION ALL
    SELECT hh.quest_key AS k FROM (
      SELECT h.quest_key, h.completed_at
        FROM public.quest_history h
        WHERE h.user_id = _uid
        ORDER BY h.completed_at DESC
        LIMIT 3
    ) hh
  ) x;

  FOR i IN 1..20 LOOP
    candidate := pool -> floor(random() * jsonb_array_length(pool))::int;
    IF recent_keys IS NULL OR NOT (candidate->>'key' = ANY(recent_keys)) THEN
      picked := candidate;
      EXIT;
    END IF;
  END LOOP;

  picked := COALESCE(picked, pool -> floor(random() * jsonb_array_length(pool))::int);
  fire := (picked->>'fire')::int;
  coins := 8 + fire * 12;
  tokens := CASE
    WHEN fire >= 9 THEN 3
    WHEN fire >= 7 THEN 2
    WHEN fire >= 4 THEN 1
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'key', picked->>'key',
    'title', picked->>'title',
    'desc', picked->>'desc',
    'target', (picked->>'base')::int,
    'fire', fire,
    'coins', coins,
    'tokens', tokens
  );
END;
$function$;

-- 4. Extend quest_progress_for to handle the new keys
CREATE OR REPLACE FUNCTION public.quest_progress_for(_uid uuid, _quest_key text, _baseline integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result integer := 0;
BEGIN
  CASE _quest_key
    WHEN 'post_note', 'post_3_notes', 'post_5_notes' THEN
      SELECT COUNT(*)::int INTO result FROM public.notes n WHERE n.user_id = _uid;
    WHEN 'react_1', 'react_3', 'react_10', 'react_25' THEN
      SELECT COUNT(*)::int INTO result FROM public.note_reactions r WHERE r.user_id = _uid;
    WHEN 'upvote_5', 'upvote_15', 'upvote_40', 'upvote_75' THEN
      SELECT COUNT(*)::int INTO result FROM public.note_votes v
        WHERE v.user_id = _uid AND v.kind = 'like';
    WHEN 'favorite_2', 'favorite_8', 'favorite_15' THEN
      SELECT COUNT(*)::int INTO result FROM public.note_favorites f WHERE f.user_id = _uid;
    WHEN 'follow_1', 'follow_3', 'follow_10' THEN
      SELECT COUNT(*)::int INTO result FROM public.follows f WHERE f.follower_id = _uid;
    WHEN 'edit_bio' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = _uid AND COALESCE(btrim(p.bio),'') <> ''
      ) THEN 1 ELSE 0 END INTO result;
    WHEN 'change_avatar' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = _uid AND COALESCE(p.avatar_key,'sparkle') <> 'sparkle'
      ) THEN 1 ELSE 0 END INTO result;
    WHEN 'colorful_note', 'colorful_3' THEN
      SELECT COUNT(*)::int INTO result FROM public.notes n
        WHERE n.user_id = _uid AND n.color <> 'yellow';
    ELSE
      result := 0;
  END CASE;
  RETURN GREATEST(0, result - _baseline);
END;
$function$;

-- 5. Add favorite_color column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS favorite_color text;