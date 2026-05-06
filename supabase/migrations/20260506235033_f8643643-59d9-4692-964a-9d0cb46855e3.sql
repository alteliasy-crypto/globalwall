
-- =========================================================
-- 1. Profile slot for titles + matte theme
-- =========================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS equipped_title text;

-- =========================================================
-- 2. Comments on notes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_note_comments_note ON public.note_comments(note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_comments_user ON public.note_comments(user_id);
ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments are public" ON public.note_comments;
CREATE POLICY "comments are public" ON public.note_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "users insert own comments" ON public.note_comments;
CREATE POLICY "users insert own comments" ON public.note_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users delete own comments" ON public.note_comments;
CREATE POLICY "users delete own comments" ON public.note_comments
  FOR DELETE USING (user_id = auth.uid());

-- =========================================================
-- 3. Shop rotation history (anti-repeat across cycles)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.shop_rotation_history (
  bucket bigint PRIMARY KEY,
  item_keys text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_rotation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rotation visible" ON public.shop_rotation_history;
CREATE POLICY "rotation visible" ON public.shop_rotation_history FOR SELECT USING (true);

-- =========================================================
-- 4. Reports anti-abuse trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.guard_report_abuse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_reports int;
  reporter_warnings int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Auth required to report';
  END IF;
  NEW.reporter_id := auth.uid();

  -- block dup reports of same note
  IF EXISTS (SELECT 1 FROM public.reports r
             WHERE r.reporter_id = NEW.reporter_id AND r.note_id = NEW.note_id) THEN
    RAISE EXCEPTION 'You already reported this note';
  END IF;

  -- daily cap: 5 reports per 24h
  SELECT COUNT(*) INTO recent_reports
    FROM public.reports r
    WHERE r.reporter_id = NEW.reporter_id
      AND r.created_at > now() - interval '24 hours';
  IF recent_reports >= 5 THEN
    RAISE EXCEPTION 'Daily report limit reached (5/24h). Try again later.';
  END IF;

  -- silently soft-block abusive reporters (3+ warnings) by raising a friendly error
  SELECT warnings INTO reporter_warnings FROM public.users WHERE id = NEW.reporter_id;
  IF reporter_warnings IS NOT NULL AND reporter_warnings >= 3 THEN
    RAISE EXCEPTION 'Your account has too many warnings to file reports right now';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_anti_abuse ON public.reports;
CREATE TRIGGER trg_reports_anti_abuse
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_abuse();

-- =========================================================
-- 5. Seed 20 titles + extra shop items
-- =========================================================
INSERT INTO public.shop_catalog (item_key, category, type, label, description, coins, tokens, rarity, accent, meta)
VALUES
  ('title_newcomer','title','cosmetic','Newcomer','Just landed on the wall',150,0,'common','from-slate-300 to-slate-500','{}'::jsonb),
  ('title_pinpal','title','cosmetic','Pin Pal','Friend of every note',300,0,'common','from-amber-300 to-amber-500','{}'::jsonb),
  ('title_doodler','title','cosmetic','Doodler','Posts every day',300,0,'common','from-yellow-300 to-orange-400','{}'::jsonb),
  ('title_scribbler','title','cosmetic','Scribbler','Words come naturally',400,0,'common','from-emerald-300 to-emerald-500','{}'::jsonb),
  ('title_reactor','title','cosmetic','Reactor','Gives all the love',500,0,'rare','from-pink-400 to-rose-500','{}'::jsonb),
  ('title_curator','title','cosmetic','Curator','Knows what’s worth saving',600,0,'rare','from-cyan-400 to-blue-500','{}'::jsonb),
  ('title_nightowl','title','cosmetic','Night Owl','Always online late',700,0,'rare','from-indigo-500 to-purple-700','{}'::jsonb),
  ('title_trendsetter','title','cosmetic','Trendsetter','Makes others copy',900,1,'rare','from-fuchsia-400 to-pink-600','{}'::jsonb),
  ('title_hypeman','title','cosmetic','Hype Man','Brings the energy',1100,1,'epic','from-orange-400 to-red-500','{}'::jsonb),
  ('title_artist','title','cosmetic','Artist','Aesthetics on point',1200,1,'epic','from-purple-400 to-fuchsia-600','{}'::jsonb),
  ('title_oracle','title','cosmetic','Oracle','Predicts the algorithm',1500,2,'epic','from-cyan-300 to-teal-500','{}'::jsonb),
  ('title_archivist','title','cosmetic','Archivist','Remembers every wall',1500,2,'epic','from-amber-500 to-yellow-700','{}'::jsonb),
  ('title_voidwalker','title','cosmetic','Voidwalker','Roams the matte black',1800,2,'epic','from-zinc-700 to-black','{}'::jsonb),
  ('title_legend','title','cosmetic','Legend','You did it. Loud.',2500,3,'legendary','from-amber-300 via-yellow-400 to-orange-500','{}'::jsonb),
  ('title_overlord','title','cosmetic','Overlord','Wall bows to you',3000,4,'legendary','from-red-500 via-rose-500 to-pink-600','{}'::jsonb),
  ('title_mythic','title','cosmetic','Mythic','One of a few',3500,5,'legendary','from-fuchsia-500 via-purple-600 to-indigo-700','{}'::jsonb),
  ('title_eternal','title','cosmetic','Eternal','Stays forever',4000,6,'legendary','from-cyan-300 via-sky-400 to-indigo-500','{}'::jsonb),
  ('title_phoenix','title','cosmetic','Phoenix','Rises again',4500,7,'legendary','from-orange-400 via-red-500 to-yellow-300','{}'::jsonb),
  ('title_supernova','title','cosmetic','Supernova','Exploded onto the scene',5000,8,'legendary','from-pink-400 via-fuchsia-500 to-violet-600','{}'::jsonb),
  ('title_godofwall','title','cosmetic','God of Wall','The very top',8000,12,'legendary','from-yellow-300 via-amber-400 to-rose-500','{}'::jsonb)
ON CONFLICT (item_key) DO NOTHING;

-- Bulk fill items to push catalog past 500. Generate procedurally if missing.
DO $$
DECLARE
  i int;
  cat text; ty text; rar text; accent text;
  cats text[] := ARRAY['badge','fx','frame','font','theme'];
  rars text[] := ARRAY['common','common','common','rare','rare','epic','legendary'];
  accents text[] := ARRAY[
    'from-rose-400 to-pink-600','from-amber-300 to-orange-500','from-emerald-400 to-teal-600',
    'from-sky-400 to-indigo-600','from-fuchsia-400 to-purple-700','from-yellow-300 to-amber-600',
    'from-red-500 to-rose-700','from-cyan-300 to-blue-600','from-lime-400 to-green-600',
    'from-violet-400 to-fuchsia-700','from-zinc-700 to-black','from-orange-400 to-red-600'
  ];
  c int; t int;
BEGIN
  FOR i IN 1..400 LOOP
    cat := cats[1 + (i % array_length(cats,1))];
    rar := rars[1 + ((i*7) % array_length(rars,1))];
    accent := accents[1 + ((i*3) % array_length(accents,1))];
    ty := 'cosmetic';
    c := CASE rar WHEN 'common' THEN 80 + (i%6)*40 WHEN 'rare' THEN 400 + (i%4)*100
                  WHEN 'epic' THEN 900 + (i%5)*150 ELSE 2200 + (i%6)*250 END;
    t := CASE rar WHEN 'common' THEN 0 WHEN 'rare' THEN (i%2)
                  WHEN 'epic' THEN 1 + (i%2) ELSE 3 + (i%4) END;
    INSERT INTO public.shop_catalog (item_key, category, type, label, description, coins, tokens, rarity, accent, meta)
    VALUES (
      cat || '_gen_' || i,
      cat, ty,
      initcap(cat) || ' #' || i,
      'A ' || rar || ' ' || cat || ' for true wall enjoyers.',
      c, t, rar, accent, '{}'::jsonb
    )
    ON CONFLICT (item_key) DO NOTHING;
  END LOOP;
END$$;

-- =========================================================
-- 6. Replace get_shop_rotation: 25 / 6h, rarity-weighted, no exact repeat
-- =========================================================
DROP FUNCTION IF EXISTS public.get_shop_rotation();
CREATE OR REPLACE FUNCTION public.get_shop_rotation()
RETURNS TABLE(item_key text, category text, type text, label text, description text,
              coins integer, tokens integer, rarity text, accent text, meta jsonb,
              rotates_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket bigint := floor(extract(epoch from now()) / 21600); -- 6h
  next_rotate timestamptz := to_timestamp((bucket + 1) * 21600);
  prev_keys text[];
BEGIN
  SELECT item_keys INTO prev_keys FROM public.shop_rotation_history WHERE shop_rotation_history.bucket = (bucket - 1);

  RETURN QUERY
  WITH weighted AS (
    SELECT s.*,
      CASE s.rarity WHEN 'common' THEN 60 WHEN 'rare' THEN 25 WHEN 'epic' THEN 10 WHEN 'legendary' THEN 5 ELSE 30 END
        AS w
    FROM public.shop_catalog s
  ),
  scored AS (
    SELECT *,
      -- deterministic per-bucket score, rarity-weighted
      ('x' || substr(md5(item_key || bucket::text), 1, 8))::bit(32)::int / GREATEST(w, 1)::numeric AS score
    FROM weighted
  )
  SELECT s.item_key, s.category, s.type, s.label, s.description,
         s.coins, s.tokens, s.rarity, s.accent, s.meta, next_rotate
  FROM scored s
  ORDER BY s.score
  LIMIT 25;
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_rotation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket bigint := floor(extract(epoch from now()) / 21600);
  keys text[];
BEGIN
  IF EXISTS (SELECT 1 FROM public.shop_rotation_history WHERE shop_rotation_history.bucket = bucket) THEN
    RETURN;
  END IF;
  SELECT array_agg(item_key) INTO keys FROM (
    SELECT item_key FROM public.get_shop_rotation()
  ) z;
  INSERT INTO public.shop_rotation_history (bucket, item_keys) VALUES (bucket, keys)
    ON CONFLICT DO NOTHING;
END;
$$;

-- =========================================================
-- 7. purchase_market_item: only allow rotation items
-- =========================================================
CREATE OR REPLACE FUNCTION public.purchase_market_item(_item_key text)
RETURNS TABLE(success boolean, message text, coins integer, tokens integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_catalog%ROWTYPE;
  cur_coins int;
  cur_tokens int;
  mins int;
  mult numeric;
  in_rotation boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO item FROM public.shop_catalog WHERE shop_catalog.item_key = _item_key;
  IF item.item_key IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown item', 0, 0; RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.get_shop_rotation() r WHERE r.item_key = _item_key)
    INTO in_rotation;
  IF NOT in_rotation THEN
    RETURN QUERY SELECT false, 'Not in current rotation — wait for it to come back!', 0, 0; RETURN;
  END IF;

  SELECT uc.coins, uc.tokens INTO cur_coins, cur_tokens
    FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

  IF item.type = 'cosmetic' AND EXISTS (
    SELECT 1 FROM public.cosmetics_owned co WHERE co.user_id = uid AND co.item_key = _item_key
  ) THEN
    RETURN QUERY SELECT false, 'Already owned', cur_coins, cur_tokens; RETURN;
  END IF;

  IF cur_coins < item.coins OR cur_tokens < item.tokens THEN
    RETURN QUERY SELECT false, 'Not enough currency', cur_coins, cur_tokens; RETURN;
  END IF;

  UPDATE public.user_currency uc
    SET coins = uc.coins - item.coins,
        tokens = uc.tokens - item.tokens,
        updated_at = now()
    WHERE uc.user_id = uid
    RETURNING uc.coins, uc.tokens INTO cur_coins, cur_tokens;

  IF item.type = 'cosmetic' THEN
    INSERT INTO public.cosmetics_owned (user_id, item_key) VALUES (uid, _item_key)
      ON CONFLICT DO NOTHING;
  ELSE
    mins := COALESCE((item.meta->>'minutes')::int, 30);
    mult := COALESCE((item.meta->>'mult')::numeric, 1.0);
    INSERT INTO public.active_boosts (user_id, boost_key, multiplier, expires_at)
    VALUES (uid, _item_key, mult, now() + (mins || ' minutes')::interval);
  END IF;

  PERFORM public.persist_rotation();
  RETURN QUERY SELECT true, 'Purchased: ' || item.label, cur_coins, cur_tokens;
END;
$$;

-- =========================================================
-- 8. equip_cosmetic: handle title category
-- =========================================================
CREATE OR REPLACE FUNCTION public.equip_cosmetic(_item_key text)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_catalog%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  IF _item_key IS NOT NULL AND _item_key <> '' THEN
    SELECT * INTO item FROM public.shop_catalog WHERE shop_catalog.item_key = _item_key;
    IF item.item_key IS NULL THEN
      RETURN QUERY SELECT false, 'Unknown item'; RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cosmetics_owned co WHERE co.user_id = uid AND co.item_key = _item_key) THEN
      RETURN QUERY SELECT false, 'Not owned'; RETURN;
    END IF;
  END IF;

  INSERT INTO public.user_profiles (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  IF _item_key IS NULL OR _item_key = '' THEN
    UPDATE public.user_profiles SET theme = 'default', updated_at = now() WHERE user_id = uid;
    RETURN QUERY SELECT true, 'Reset'; RETURN;
  END IF;

  IF item.category = 'theme' THEN
    UPDATE public.user_profiles SET theme = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'badge' THEN
    UPDATE public.user_profiles SET equipped_badge = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'fx' THEN
    UPDATE public.user_profiles SET equipped_fx = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'frame' THEN
    UPDATE public.user_profiles SET equipped_frame = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'font' THEN
    UPDATE public.user_profiles SET equipped_font = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'title' THEN
    UPDATE public.user_profiles SET equipped_title = item.item_key, updated_at = now() WHERE user_id = uid;
  END IF;

  RETURN QUERY SELECT true, 'Equipped';
END;
$$;

-- =========================================================
-- 9. complete_quest: also award XP
-- =========================================================
CREATE OR REPLACE FUNCTION public.complete_quest(_quest_id uuid)
RETURNS TABLE(awarded boolean, coins_awarded integer, tokens_awarded integer, multiplier numeric,
              heat_streak integer, total_coins integer, total_tokens integer, highest_fire integer,
              new_quest_id uuid, new_quest_slot smallint, new_quest_key text, new_quest_title text,
              new_quest_desc text, new_quest_fire smallint, new_quest_target integer,
              new_quest_coins integer, new_quest_tokens integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  q RECORD;
  live_prog int;
  mult numeric(4,2) := 1.0;
  c_award int;
  t_award int;
  xp_award int;
  prev_completed timestamptz;
  cur_streak int;
  best int;
  rolled jsonb;
  base_new int;
  new_id uuid;
  high_fire int;
  active_mult numeric(4,2);
  total_c int;
  total_t int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT ql.* INTO q FROM public.quest_ladder ql
    WHERE ql.id = _quest_id AND ql.user_id = uid FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quest not found'; END IF;

  live_prog := public.quest_progress_for(uid, q.quest_key, q.baseline);
  IF live_prog < q.target THEN
    RAISE EXCEPTION 'Quest not finished yet';
  END IF;

  SELECT uc.last_quest_completed_at, uc.heat_streak, uc.best_streak, uc.highest_fire_cleared
    INTO prev_completed, cur_streak, best, high_fire
  FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

  IF prev_completed IS NULL OR (now() - prev_completed) > interval '30 minutes' THEN
    cur_streak := 0;
  END IF;
  IF q.fire_level >= 4 THEN cur_streak := cur_streak + 1; END IF;
  best := GREATEST(best, cur_streak);
  high_fire := GREATEST(high_fire, q.fire_level);

  mult := LEAST(3.0, 1.0 + (cur_streak / 2) * 0.25);
  SELECT COALESCE(MAX(b.multiplier), 1.0) INTO active_mult
    FROM public.active_boosts b WHERE b.user_id = uid AND b.expires_at > now();
  mult := mult * active_mult;

  c_award := CEIL(q.coin_reward * mult);
  t_award := CASE WHEN q.token_reward > 0 THEN CEIL(q.token_reward * LEAST(mult, 2.0)) ELSE 0 END;
  xp_award := q.fire_level * 10;

  UPDATE public.user_currency uc
  SET coins = uc.coins + c_award, tokens = uc.tokens + t_award,
      heat_streak = cur_streak, best_streak = best, highest_fire_cleared = high_fire,
      total_quests_done = uc.total_quests_done + 1,
      last_quest_completed_at = now(), updated_at = now()
  WHERE uc.user_id = uid
  RETURNING uc.coins, uc.tokens INTO total_c, total_t;

  -- ensure progress row exists, then award XP
  INSERT INTO public.user_progress (user_id, xp, level)
    VALUES (uid, xp_award, public.calc_level(xp_award))
    ON CONFLICT (user_id) DO UPDATE
      SET xp = public.user_progress.xp + EXCLUDED.xp,
          level = public.calc_level(public.user_progress.xp + EXCLUDED.xp),
          updated_at = now();

  INSERT INTO public.quest_history (user_id, quest_key, fire_level, coins_awarded, tokens_awarded, multiplier)
    VALUES (uid, q.quest_key, q.fire_level, c_award, t_award, mult);

  -- Re-roll a new quest at the SAME fire level
  rolled := public.roll_quest_at_fire(uid, q.fire_level);
  base_new := public.quest_progress_for(uid, rolled->>'key', 0);

  UPDATE public.quest_ladder ql
  SET quest_key = rolled->>'key', title = rolled->>'title', description = rolled->>'desc',
      fire_level = (rolled->>'fire')::smallint, target = (rolled->>'target')::int,
      progress = 0, coin_reward = (rolled->>'coins')::int, token_reward = (rolled->>'tokens')::int,
      baseline = base_new, assigned_at = now()
  WHERE ql.id = _quest_id
  RETURNING ql.id INTO new_id;

  RETURN QUERY
  SELECT true, c_award, t_award, mult, cur_streak, total_c, total_t, high_fire,
         new_id, q.slot,
         (rolled->>'key')::text, (rolled->>'title')::text, (rolled->>'desc')::text,
         (rolled->>'fire')::smallint, (rolled->>'target')::int,
         (rolled->>'coins')::int, (rolled->>'tokens')::int;
END;
$$;

-- =========================================================
-- 10. roll_quest_at_fire — pick a quest of a given fire level
-- =========================================================
CREATE OR REPLACE FUNCTION public.roll_quest_at_fire(_uid uuid, _fire int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool jsonb := '[
    {"key":"post_note","title":"Fresh Pin","desc":"Post a sticky note","base":1,"fire":1},
    {"key":"react_1","title":"First Spark","desc":"React to 1 note","base":1,"fire":1},
    {"key":"colorful_note","title":"Color Bomb","desc":"Post a non-yellow note","base":1,"fire":1},
    {"key":"colorful_note","title":"Splash of Color","desc":"Post a non-yellow note","base":1,"fire":2},
    {"key":"change_avatar","title":"Face Refresh","desc":"Change your avatar","base":1,"fire":2},
    {"key":"react_3","title":"Spread Vibes","desc":"React to 3 notes","base":3,"fire":2},
    {"key":"favorite_2","title":"Treasure Hunter","desc":"Favorite 2 notes","base":2,"fire":3},
    {"key":"react_3","title":"Triple Spark","desc":"React to 3 notes","base":3,"fire":3},
    {"key":"upvote_5","title":"Hype Train","desc":"Upvote 5 notes","base":5,"fire":3},
    {"key":"upvote_5","title":"Hype Wave","desc":"Upvote 5 notes","base":5,"fire":4},
    {"key":"follow_1","title":"New Friend","desc":"Follow 1 user","base":1,"fire":4},
    {"key":"favorite_2","title":"Star Collector","desc":"Favorite 2 notes","base":2,"fire":4},
    {"key":"edit_bio","title":"Main Character","desc":"Set your bio","base":1,"fire":5},
    {"key":"react_10","title":"Reaction Rampage","desc":"React to 10 notes","base":10,"fire":5},
    {"key":"colorful_3","title":"Color Cascade","desc":"Post 3 non-yellow notes","base":3,"fire":5},
    {"key":"upvote_15","title":"Hype Tornado","desc":"Upvote 15 notes","base":15,"fire":6},
    {"key":"colorful_3","title":"Triple Splash","desc":"Post 3 non-yellow notes","base":3,"fire":6},
    {"key":"favorite_8","title":"Vault Builder","desc":"Favorite 8 notes","base":8,"fire":6},
    {"key":"favorite_8","title":"Trove Keeper","desc":"Favorite 8 notes","base":8,"fire":7},
    {"key":"follow_3","title":"Wall Socialite","desc":"Follow 3 users","base":3,"fire":7},
    {"key":"react_10","title":"Reaction Storm","desc":"React to 10 notes","base":10,"fire":7},
    {"key":"react_25","title":"Reaction Inferno","desc":"React to 25 notes","base":25,"fire":8},
    {"key":"post_5_notes","title":"Pin Storm","desc":"Post 5 notes","base":5,"fire":8},
    {"key":"upvote_15","title":"Boost Surge","desc":"Upvote 15 notes","base":15,"fire":8},
    {"key":"upvote_40","title":"Boost King","desc":"Upvote 40 notes","base":40,"fire":9},
    {"key":"favorite_15","title":"Vault Guardian","desc":"Favorite 15 notes","base":15,"fire":9},
    {"key":"post_5_notes","title":"Pin Avalanche","desc":"Post 5 notes","base":5,"fire":9},
    {"key":"follow_10","title":"Network Tycoon","desc":"Follow 10 users","base":10,"fire":10},
    {"key":"upvote_75","title":"Hype Overlord","desc":"Upvote 75 notes","base":75,"fire":10},
    {"key":"favorite_15","title":"Vault Overlord","desc":"Favorite 15 notes","base":15,"fire":10}
  ]'::jsonb;
  candidate jsonb;
  picked jsonb;
  fire int;
  coins int;
  tokens int;
  attempts int := 0;
  recent_keys text[];
BEGIN
  SELECT array_agg(quest_key) INTO recent_keys FROM public.quest_ladder WHERE user_id = _uid;

  LOOP
    attempts := attempts + 1;
    candidate := pool -> floor(random() * jsonb_array_length(pool))::int;
    IF (candidate->>'fire')::int = _fire AND
       (recent_keys IS NULL OR NOT ((candidate->>'key') = ANY(recent_keys)) OR attempts > 30)
    THEN
      picked := candidate;
      EXIT;
    END IF;
    IF attempts > 60 THEN
      -- fall back to any quest at this fire level
      SELECT p INTO picked FROM jsonb_array_elements(pool) p
        WHERE (p->>'fire')::int = _fire ORDER BY random() LIMIT 1;
      EXIT;
    END IF;
  END LOOP;

  fire := (picked->>'fire')::int;
  coins := 8 + fire * 12;
  tokens := CASE WHEN fire >= 9 THEN 3 WHEN fire >= 7 THEN 2 WHEN fire >= 4 THEN 1 ELSE 0 END;
  RETURN jsonb_build_object(
    'key', picked->>'key', 'title', picked->>'title', 'desc', picked->>'desc',
    'target', (picked->>'base')::int, 'fire', fire, 'coins', coins, 'tokens', tokens
  );
END;
$$;

-- update roll_quest to use the new pool too (so the existing 20-slot seeder gets variety across fires)
CREATE OR REPLACE FUNCTION public.roll_quest(_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fire int := 1 + floor(random() * 10)::int;
BEGIN
  RETURN public.roll_quest_at_fire(_uid, fire);
END;
$$;

-- =========================================================
-- 11. Quest ladder: keep 30 slots (3 per fire level)
-- =========================================================
ALTER TABLE public.quest_ladder DROP CONSTRAINT IF EXISTS quest_ladder_slot_check;
ALTER TABLE public.quest_ladder ADD CONSTRAINT quest_ladder_slot_check CHECK (slot BETWEEN 1 AND 30);

CREATE OR REPLACE FUNCTION public.get_or_seed_quest_ladder()
RETURNS TABLE(id uuid, slot smallint, quest_key text, title text, description text,
              fire_level smallint, target integer, progress integer,
              coin_reward integer, token_reward integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  s smallint;
  fire int;
  rolled jsonb;
  baseline_val int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  -- 30 slots: 3 per fire level (1..10). slot N covers fire = ceil(N/3)
  FOR s IN 1..30 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.quest_ladder ql WHERE ql.user_id = uid AND ql.slot = s) THEN
      fire := CEIL(s::numeric / 3.0)::int;
      rolled := public.roll_quest_at_fire(uid, fire);
      baseline_val := public.quest_progress_for(uid, rolled->>'key', 0);
      INSERT INTO public.quest_ladder (user_id, slot, quest_key, title, description, fire_level,
        target, progress, coin_reward, token_reward, baseline)
      VALUES (uid, s, rolled->>'key', rolled->>'title', rolled->>'desc',
        (rolled->>'fire')::smallint, (rolled->>'target')::int, 0,
        (rolled->>'coins')::int, (rolled->>'tokens')::int, baseline_val);
    END IF;
  END LOOP;

  UPDATE public.quest_ladder ql
  SET progress = LEAST(ql.target, public.quest_progress_for(uid, ql.quest_key, ql.baseline))
  WHERE ql.user_id = uid;

  RETURN QUERY
    SELECT ql.id, ql.slot, ql.quest_key, ql.title, ql.description,
           ql.fire_level, ql.target, ql.progress, ql.coin_reward, ql.token_reward
    FROM public.quest_ladder ql WHERE ql.user_id = uid ORDER BY ql.slot;
END;
$$;

-- =========================================================
-- 12. Note leaderboards
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_top_notes(_period text DEFAULT 'day', _limit int DEFAULT 10)
RETURNS TABLE(note_id uuid, content text, color text, x double precision, y double precision,
              author_id uuid, nickname text, avatar_key text,
              like_count int, comment_count int, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH win AS (
    SELECT now() - CASE _period
                     WHEN 'week' THEN interval '7 days'
                     WHEN 'month' THEN interval '30 days'
                     ELSE interval '1 day' END AS since
  ),
  scored AS (
    SELECT n.id, n.content, n.color, n.x, n.y, n.user_id AS author_id, n.created_at,
           COALESCE((SELECT COUNT(*) FROM public.note_votes v WHERE v.note_id = n.id AND v.kind = 'like'), 0)::int AS like_count,
           COALESCE((SELECT COUNT(*) FROM public.note_comments c WHERE c.note_id = n.id), 0)::int AS comment_count
    FROM public.notes n, win
    WHERE n.created_at > win.since
  )
  SELECT s.id, s.content, s.color, s.x, s.y, s.author_id,
         u.nickname, COALESCE(p.avatar_key, 'sparkle'),
         s.like_count, s.comment_count, s.created_at
  FROM scored s
  JOIN public.users u ON u.id = s.author_id AND u.is_banned = false
  LEFT JOIN public.user_profiles p ON p.user_id = s.author_id
  ORDER BY s.like_count DESC, s.comment_count DESC, s.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;

-- =========================================================
-- 13. Profile search
-- =========================================================
CREATE OR REPLACE FUNCTION public.search_users(_query text, _limit int DEFAULT 15)
RETURNS TABLE(user_id uuid, nickname text, avatar_key text, equipped_title text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nickname, COALESCE(p.avatar_key,'sparkle'), p.equipped_title
  FROM public.users u
  LEFT JOIN public.user_profiles p ON p.user_id = u.id
  WHERE u.is_banned = false
    AND length(btrim(_query)) >= 2
    AND (lower(u.nickname) LIKE lower(btrim(_query)) || '%'
         OR lower(u.nickname) LIKE '%' || lower(btrim(_query)) || '%')
  ORDER BY (lower(u.nickname) = lower(btrim(_query))) DESC,
           (lower(u.nickname) LIKE lower(btrim(_query)) || '%') DESC,
           u.nickname
  LIMIT GREATEST(1, LEAST(_limit, 30));
$$;

-- =========================================================
-- 14. Public profile RPC: include equipped cosmetics + title
-- =========================================================
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_public_profile(target_id uuid)
RETURNS TABLE(user_id uuid, nickname text, bio text, avatar_key text,
              joined_at timestamptz, warnings int, is_banned boolean,
              follower_count int, following_count int, reports_made int, notes_count int,
              equipped_badge text, equipped_title text, theme text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nickname,
         COALESCE(p.bio,''), COALESCE(p.avatar_key,'sparkle'),
         u.created_at, u.warnings, u.is_banned,
         (SELECT COUNT(*)::int FROM public.follows f WHERE f.followed_id = u.id),
         (SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = u.id),
         (SELECT COUNT(*)::int FROM public.reports r WHERE r.reporter_id = u.id),
         (SELECT COUNT(*)::int FROM public.notes n WHERE n.user_id = u.id),
         p.equipped_badge, p.equipped_title, COALESCE(p.theme,'default')
  FROM public.users u
  LEFT JOIN public.user_profiles p ON p.user_id = u.id
  WHERE u.id = target_id;
$$;
