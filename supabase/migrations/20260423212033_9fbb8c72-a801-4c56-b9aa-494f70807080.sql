
-- =========================================================
-- QUEST LADDER (v5.0.0)
-- =========================================================

-- Currency wallet per user
CREATE TABLE IF NOT EXISTS public.user_currency (
  user_id uuid PRIMARY KEY,
  coins integer NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  heat_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  highest_fire_cleared integer NOT NULL DEFAULT 0,
  total_quests_done integer NOT NULL DEFAULT 0,
  last_quest_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_currency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet view all" ON public.user_currency;
CREATE POLICY "wallet view all" ON public.user_currency
  FOR SELECT TO authenticated USING (true);

-- Active 3-slot quest ladder
CREATE TABLE IF NOT EXISTS public.quest_ladder (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  quest_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  fire_level smallint NOT NULL CHECK (fire_level BETWEEN 1 AND 10),
  target integer NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  coin_reward integer NOT NULL,
  token_reward integer NOT NULL,
  baseline integer NOT NULL DEFAULT 0,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot)
);
ALTER TABLE public.quest_ladder ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ladder view own" ON public.quest_ladder;
CREATE POLICY "ladder view own" ON public.quest_ladder
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Quest history (for streaks + analytics)
CREATE TABLE IF NOT EXISTS public.quest_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_key text NOT NULL,
  fire_level smallint NOT NULL,
  coins_awarded integer NOT NULL,
  tokens_awarded integer NOT NULL,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.0,
  completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quest_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history view own" ON public.quest_history;
CREATE POLICY "history view own" ON public.quest_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_quest_history_user_time
  ON public.quest_history (user_id, completed_at DESC);

-- Cosmetics owned
CREATE TABLE IF NOT EXISTS public.cosmetics_owned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);
ALTER TABLE public.cosmetics_owned ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cosmetics view own" ON public.cosmetics_owned;
CREATE POLICY "cosmetics view own" ON public.cosmetics_owned
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Active boosts
CREATE TABLE IF NOT EXISTS public.active_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  boost_key text NOT NULL,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.active_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boosts view own" ON public.active_boosts;
CREATE POLICY "boosts view own" ON public.active_boosts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- HELPERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.quest_progress_for(_uid uuid, _quest_key text, _baseline integer)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result integer := 0;
BEGIN
  CASE _quest_key
    WHEN 'post_note', 'post_3_notes', 'post_5_notes' THEN
      SELECT COUNT(*)::int INTO result FROM public.notes n WHERE n.user_id = _uid;
    WHEN 'react_3', 'react_10', 'react_25' THEN
      SELECT COUNT(*)::int INTO result FROM public.note_reactions r WHERE r.user_id = _uid;
    WHEN 'upvote_5', 'upvote_15', 'upvote_40' THEN
      SELECT COUNT(*)::int INTO result FROM public.note_votes v
        WHERE v.user_id = _uid AND v.kind = 'like';
    WHEN 'favorite_2', 'favorite_8' THEN
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
$$;

-- Roll a fresh quest record (jsonb) — picks fire level, scales rewards
CREATE OR REPLACE FUNCTION public.roll_quest(_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  pool jsonb := '[
    {"key":"post_note","title":"Fresh Pin","desc":"Post a sticky note","base":1,"fire":1},
    {"key":"colorful_note","title":"Color Bomb","desc":"Post a non-yellow note","base":1,"fire":2},
    {"key":"react_3","title":"Spread Vibes","desc":"React to 3 notes","base":3,"fire":2},
    {"key":"favorite_2","title":"Treasure Hunter","desc":"Favorite 2 notes","base":2,"fire":2},
    {"key":"follow_1","title":"New Friend","desc":"Follow 1 user","base":1,"fire":3},
    {"key":"upvote_5","title":"Hype Train","desc":"Upvote 5 notes","base":5,"fire":3},
    {"key":"edit_bio","title":"Main Character","desc":"Set your bio","base":1,"fire":3},
    {"key":"change_avatar","title":"Face Refresh","desc":"Change your avatar","base":1,"fire":2},
    {"key":"react_10","title":"Reaction Rampage","desc":"React to 10 notes","base":10,"fire":5},
    {"key":"upvote_15","title":"Hype Tornado","desc":"Upvote 15 notes","base":15,"fire":6},
    {"key":"colorful_3","title":"Color Cascade","desc":"Post 3 non-yellow notes","base":3,"fire":6},
    {"key":"favorite_8","title":"Trove Keeper","desc":"Favorite 8 notes","base":8,"fire":6},
    {"key":"follow_3","title":"Wall Socialite","desc":"Follow 3 users","base":3,"fire":7},
    {"key":"react_25","title":"Reaction Inferno","desc":"React to 25 notes","base":25,"fire":8},
    {"key":"upvote_40","title":"Boost King","desc":"Upvote 40 notes","base":40,"fire":9},
    {"key":"follow_10","title":"Network Tycoon","desc":"Follow 10 users","base":10,"fire":10}
  ]'::jsonb;
  recent_keys text[];
  candidate jsonb;
  picked jsonb;
  fire int;
  coins int;
  tokens int;
BEGIN
  -- Avoid currently active or last-3 finished quests
  SELECT array_agg(quest_key) INTO recent_keys FROM (
    SELECT q.quest_key FROM public.quest_ladder q WHERE q.user_id = _uid
    UNION ALL
    SELECT h.quest_key FROM public.quest_history h
      WHERE h.user_id = _uid ORDER BY h.completed_at DESC LIMIT 3
  ) x;

  -- Try a few random picks that aren't recent
  FOR i IN 1..12 LOOP
    candidate := pool -> floor(random() * jsonb_array_length(pool))::int;
    IF recent_keys IS NULL OR NOT (candidate->>'key' = ANY(recent_keys)) THEN
      picked := candidate;
      EXIT;
    END IF;
  END LOOP;

  picked := COALESCE(picked, pool -> floor(random() * jsonb_array_length(pool))::int);
  fire := (picked->>'fire')::int;
  coins := 8 + fire * 12;             -- 20..128
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
$$;

-- =========================================================
-- MAIN RPCs
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_or_seed_quest_ladder()
RETURNS TABLE(
  id uuid, slot smallint, quest_key text, title text, description text,
  fire_level smallint, target integer, progress integer,
  coin_reward integer, token_reward integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  s smallint;
  rolled jsonb;
  baseline_val int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  INSERT INTO public.user_currency (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;

  -- Fill empty slots
  FOR s IN 1..3 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.quest_ladder ql WHERE ql.user_id = uid AND ql.slot = s) THEN
      rolled := public.roll_quest(uid);
      baseline_val := public.quest_progress_for(uid, rolled->>'key', 0);
      INSERT INTO public.quest_ladder (
        user_id, slot, quest_key, title, description, fire_level,
        target, progress, coin_reward, token_reward, baseline
      ) VALUES (
        uid, s, rolled->>'key', rolled->>'title', rolled->>'desc',
        (rolled->>'fire')::smallint,
        (rolled->>'target')::int, 0,
        (rolled->>'coins')::int, (rolled->>'tokens')::int,
        baseline_val
      );
    END IF;
  END LOOP;

  -- Refresh live progress
  UPDATE public.quest_ladder ql
  SET progress = LEAST(ql.target, public.quest_progress_for(uid, ql.quest_key, ql.baseline))
  WHERE ql.user_id = uid;

  RETURN QUERY
    SELECT ql.id, ql.slot, ql.quest_key, ql.title, ql.description,
           ql.fire_level, ql.target, ql.progress,
           ql.coin_reward, ql.token_reward
    FROM public.quest_ladder ql
    WHERE ql.user_id = uid
    ORDER BY ql.slot;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_quest(_quest_id uuid)
RETURNS TABLE(
  awarded boolean,
  coins_awarded integer, tokens_awarded integer,
  multiplier numeric, heat_streak integer,
  total_coins integer, total_tokens integer,
  highest_fire integer,
  new_quest_id uuid, new_quest_slot smallint,
  new_quest_key text, new_quest_title text, new_quest_desc text,
  new_quest_fire smallint, new_quest_target integer,
  new_quest_coins integer, new_quest_tokens integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  q RECORD;
  live_prog int;
  mult numeric(4,2) := 1.0;
  c_award int;
  t_award int;
  prev_completed timestamptz;
  cur_streak int;
  best int;
  rolled jsonb;
  base_new int;
  new_id uuid;
  high_fire int;
  active_mult numeric(4,2);
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT * INTO q FROM public.quest_ladder ql
    WHERE ql.id = _quest_id AND ql.user_id = uid
    FOR UPDATE;

  IF q.id IS NULL THEN RAISE EXCEPTION 'Quest not found'; END IF;

  live_prog := public.quest_progress_for(uid, q.quest_key, q.baseline);
  IF live_prog < q.target THEN
    RAISE EXCEPTION 'Quest not finished yet';
  END IF;

  -- Heat streak logic: chain if last completion was within 30 minutes
  SELECT last_quest_completed_at, heat_streak, best_streak, highest_fire_cleared
    INTO prev_completed, cur_streak, best, high_fire
  FROM public.user_currency WHERE user_id = uid FOR UPDATE;

  IF prev_completed IS NULL OR (now() - prev_completed) > interval '30 minutes' THEN
    cur_streak := 0;
  END IF;

  -- Only high-fire quests (>=4) build heat streak
  IF q.fire_level >= 4 THEN
    cur_streak := cur_streak + 1;
  END IF;
  best := GREATEST(best, cur_streak);
  high_fire := GREATEST(high_fire, q.fire_level);

  -- Streak multiplier: every 2 streak = +0.25x, capped at 3x
  mult := LEAST(3.0, 1.0 + (cur_streak / 2) * 0.25);

  -- Active boost multiplier (stack pick highest)
  SELECT COALESCE(MAX(b.multiplier), 1.0) INTO active_mult
  FROM public.active_boosts b
  WHERE b.user_id = uid AND b.expires_at > now();
  mult := mult * active_mult;

  c_award := CEIL(q.coin_reward * mult);
  t_award := CASE WHEN q.token_reward > 0 THEN CEIL(q.token_reward * LEAST(mult, 2.0)) ELSE 0 END;

  -- Award
  UPDATE public.user_currency
  SET coins = coins + c_award,
      tokens = tokens + t_award,
      heat_streak = cur_streak,
      best_streak = best,
      highest_fire_cleared = high_fire,
      total_quests_done = total_quests_done + 1,
      last_quest_completed_at = now(),
      updated_at = now()
  WHERE user_id = uid;

  INSERT INTO public.quest_history (user_id, quest_key, fire_level, coins_awarded, tokens_awarded, multiplier)
    VALUES (uid, q.quest_key, q.fire_level, c_award, t_award, mult);

  -- Roll replacement
  rolled := public.roll_quest(uid);
  base_new := public.quest_progress_for(uid, rolled->>'key', 0);

  UPDATE public.quest_ladder
  SET quest_key = rolled->>'key',
      title = rolled->>'title',
      description = rolled->>'desc',
      fire_level = (rolled->>'fire')::smallint,
      target = (rolled->>'target')::int,
      progress = 0,
      coin_reward = (rolled->>'coins')::int,
      token_reward = (rolled->>'tokens')::int,
      baseline = base_new,
      assigned_at = now()
  WHERE id = _quest_id
  RETURNING id INTO new_id;

  RETURN QUERY
  SELECT true,
         c_award, t_award, mult, cur_streak,
         (SELECT coins FROM public.user_currency WHERE user_id = uid),
         (SELECT tokens FROM public.user_currency WHERE user_id = uid),
         high_fire,
         new_id, q.slot,
         rolled->>'key', rolled->>'title', rolled->>'desc',
         (rolled->>'fire')::smallint, (rolled->>'target')::int,
         (rolled->>'coins')::int, (rolled->>'tokens')::int;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS TABLE(
  coins integer, tokens integer,
  heat_streak integer, best_streak integer,
  highest_fire_cleared integer, total_quests_done integer,
  current_multiplier numeric, active_boost_key text,
  active_boost_expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT uc.coins, uc.tokens, uc.heat_streak, uc.best_streak,
         uc.highest_fire_cleared, uc.total_quests_done,
         LEAST(3.0,
           1.0 + (
             CASE WHEN uc.last_quest_completed_at IS NULL OR (now() - uc.last_quest_completed_at) > interval '30 minutes'
               THEN 0 ELSE uc.heat_streak / 2 END
           ) * 0.25
         ) * COALESCE((SELECT MAX(b.multiplier) FROM public.active_boosts b WHERE b.user_id = uid AND b.expires_at > now()), 1.0),
         (SELECT b.boost_key FROM public.active_boosts b WHERE b.user_id = uid AND b.expires_at > now()
            ORDER BY b.multiplier DESC LIMIT 1),
         (SELECT b.expires_at FROM public.active_boosts b WHERE b.user_id = uid AND b.expires_at > now()
            ORDER BY b.expires_at DESC LIMIT 1)
  FROM public.user_currency uc WHERE uc.user_id = uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wall_street_rankings(_limit integer DEFAULT 25)
RETURNS TABLE(
  rank integer, user_id uuid, nickname text, avatar_key text,
  coins integer, tokens integer, heat_streak integer,
  highest_fire_cleared integer, total_quests_done integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY uc.coins DESC, uc.highest_fire_cleared DESC, uc.heat_streak DESC
    )::int AS rank,
    uc.user_id,
    u.nickname,
    COALESCE(p.avatar_key, 'sparkle') AS avatar_key,
    uc.coins, uc.tokens, uc.heat_streak,
    uc.highest_fire_cleared, uc.total_quests_done
  FROM public.user_currency uc
  JOIN public.users u ON u.id = uc.user_id
  LEFT JOIN public.user_profiles p ON p.user_id = uc.user_id
  WHERE u.is_banned = false
  ORDER BY uc.coins DESC, uc.highest_fire_cleared DESC, uc.heat_streak DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

CREATE OR REPLACE FUNCTION public.purchase_market_item(_item_key text)
RETURNS TABLE(
  success boolean, message text,
  coins integer, tokens integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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

  SELECT coins, tokens INTO cur_coins, cur_tokens
    FROM public.user_currency WHERE user_id = uid FOR UPDATE;

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

  UPDATE public.user_currency
  SET coins = coins - c_cost, tokens = tokens - t_cost, updated_at = now()
  WHERE user_id = uid
  RETURNING coins, tokens INTO cur_coins, cur_tokens;

  RETURN QUERY SELECT true, 'Purchased: ' || (item->>'label'), cur_coins, cur_tokens;
END;
$$;
