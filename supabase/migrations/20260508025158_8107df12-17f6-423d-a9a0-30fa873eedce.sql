
-- =========== NEWS REWARDS ===========
CREATE TABLE IF NOT EXISTS public.news_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version text NOT NULL,
  coins_awarded int NOT NULL DEFAULT 0,
  tokens_awarded int NOT NULL DEFAULT 0,
  xp_awarded int NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, version)
);
ALTER TABLE public.news_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own news claims" ON public.news_claims FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_news_reward(_version text)
RETURNS TABLE(success boolean, message text, coins int, tokens int, xp int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  c int;
  t int;
  x int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF EXISTS (SELECT 1 FROM public.news_claims WHERE user_id = uid AND version = _version) THEN
    RETURN QUERY SELECT false, 'Already claimed', 0, 0, 0; RETURN;
  END IF;
  c := 25 + floor(random() * 175)::int;
  t := CASE WHEN random() < 0.35 THEN 1 + floor(random() * 3)::int ELSE 0 END;
  x := 20 + floor(random() * 80)::int;
  INSERT INTO public.news_claims(user_id, version, coins_awarded, tokens_awarded, xp_awarded)
    VALUES(uid, _version, c, t, x);
  INSERT INTO public.user_currency(user_id, coins, tokens) VALUES(uid, c, t)
    ON CONFLICT(user_id) DO UPDATE SET coins = user_currency.coins + c, tokens = user_currency.tokens + t, updated_at = now();
  PERFORM public.award_xp(uid, x);
  RETURN QUERY SELECT true, 'Claimed!', c, t, x;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_news_claims()
RETURNS TABLE(version text, coins_awarded int, tokens_awarded int, xp_awarded int, claimed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT version, coins_awarded, tokens_awarded, xp_awarded, claimed_at
  FROM public.news_claims WHERE user_id = auth.uid();
$$;

-- =========== DAILY WALL EVENT ===========
-- Auto-derived: today's challenge picks a random theme by date seed.
CREATE OR REPLACE FUNCTION public.get_daily_event()
RETURNS TABLE(event_date date, title text, description text, kind text, target int)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  d date := current_date;
  seed int := abs(hashtext(d::text)) % 5;
  k text;
  ttl text;
  desc_ text;
  tgt int;
BEGIN
  CASE seed
    WHEN 0 THEN k := 'post_notes'; ttl := 'Pin Day'; desc_ := 'Post the most notes today'; tgt := 10;
    WHEN 1 THEN k := 'react'; ttl := 'Reaction Frenzy'; desc_ := 'React to the most notes today'; tgt := 25;
    WHEN 2 THEN k := 'upvote'; ttl := 'Hype Day'; desc_ := 'Upvote the most notes today'; tgt := 25;
    WHEN 3 THEN k := 'favorite'; ttl := 'Treasure Day'; desc_ := 'Favorite the most notes today'; tgt := 15;
    ELSE k := 'comment'; ttl := 'Reply Day'; desc_ := 'Comment the most today'; tgt := 15;
  END CASE;
  RETURN QUERY SELECT d, ttl, desc_, k, tgt;
END $$;

CREATE OR REPLACE FUNCTION public.get_daily_event_leaderboard(_limit int DEFAULT 25)
RETURNS TABLE(rank int, user_id uuid, nickname text, avatar_key text, score int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev record;
BEGIN
  SELECT * INTO ev FROM public.get_daily_event();
  RETURN QUERY
  WITH counts AS (
    SELECT
      CASE ev.kind
        WHEN 'post_notes' THEN (SELECT user_id FROM public.notes WHERE created_at::date = ev.event_date)
        WHEN 'react' THEN (SELECT user_id FROM public.note_reactions WHERE created_at::date = ev.event_date)
        WHEN 'upvote' THEN (SELECT user_id FROM public.note_votes WHERE kind='like' AND created_at::date = ev.event_date)
        WHEN 'favorite' THEN (SELECT user_id FROM public.note_favorites WHERE created_at::date = ev.event_date)
        ELSE (SELECT user_id FROM public.note_comments WHERE created_at::date = ev.event_date)
      END AS uid
  ),
  agg AS (
    SELECT u_id, COUNT(*)::int AS sc FROM (
      SELECT user_id AS u_id FROM public.notes WHERE created_at::date = ev.event_date AND ev.kind='post_notes'
      UNION ALL
      SELECT user_id AS u_id FROM public.note_reactions WHERE created_at::date = ev.event_date AND ev.kind='react'
      UNION ALL
      SELECT user_id AS u_id FROM public.note_votes WHERE kind='like' AND created_at::date = ev.event_date AND ev.kind='upvote'
      UNION ALL
      SELECT user_id AS u_id FROM public.note_favorites WHERE created_at::date = ev.event_date AND ev.kind='favorite'
      UNION ALL
      SELECT user_id AS u_id FROM public.note_comments WHERE created_at::date = ev.event_date AND ev.kind='comment'
    ) z
    GROUP BY u_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY a.sc DESC)::int AS rank,
         a.u_id, u.nickname, COALESCE(p.avatar_key,'sparkle'), a.sc
  FROM agg a
  JOIN public.users u ON u.id = a.u_id AND u.is_banned = false
  LEFT JOIN public.user_profiles p ON p.user_id = a.u_id
  ORDER BY a.sc DESC LIMIT GREATEST(1, LEAST(_limit, 100));
END $$;

-- =========== WALL GUILDS ===========
CREATE TABLE IF NOT EXISTS public.guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL,
  color text NOT NULL DEFAULT 'from-amber-400 to-orange-500',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guilds public read" ON public.guilds FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.guild_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(guild_id, user_id)
);
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guild members public read" ON public.guild_members FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.create_guild(_name text, _description text, _color text)
RETURNS TABLE(success boolean, message text, guild_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  gid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = uid) THEN
    RETURN QUERY SELECT false, 'Leave your current guild first', NULL::uuid; RETURN;
  END IF;
  IF length(btrim(_name)) < 3 OR length(_name) > 24 THEN
    RETURN QUERY SELECT false, 'Name must be 3–24 chars', NULL::uuid; RETURN;
  END IF;
  INSERT INTO public.guilds(name, description, owner_id, color)
    VALUES(btrim(_name), COALESCE(_description,''), uid, COALESCE(_color,'from-amber-400 to-orange-500'))
    RETURNING id INTO gid;
  INSERT INTO public.guild_members(guild_id, user_id, role) VALUES(gid, uid, 'owner');
  RETURN QUERY SELECT true, 'Guild created', gid;
END $$;

CREATE OR REPLACE FUNCTION public.join_guild(_guild_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = uid) THEN
    RETURN QUERY SELECT false, 'Leave your current guild first'; RETURN;
  END IF;
  INSERT INTO public.guild_members(guild_id, user_id) VALUES(_guild_id, uid);
  RETURN QUERY SELECT true, 'Joined!';
END $$;

CREATE OR REPLACE FUNCTION public.leave_guild()
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  DELETE FROM public.guild_members WHERE user_id = uid;
  RETURN QUERY SELECT true, 'Left guild';
END $$;

CREATE OR REPLACE FUNCTION public.get_guild_leaderboard(_limit int DEFAULT 25)
RETURNS TABLE(rank int, guild_id uuid, name text, color text, member_count int, total_xp int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(up.xp),0) DESC)::int AS rank,
         g.id, g.name, g.color,
         COUNT(gm.user_id)::int AS member_count,
         COALESCE(SUM(up.xp),0)::int AS total_xp
  FROM public.guilds g
  LEFT JOIN public.guild_members gm ON gm.guild_id = g.id
  LEFT JOIN public.user_progress up ON up.user_id = gm.user_id
  GROUP BY g.id
  ORDER BY total_xp DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

CREATE OR REPLACE FUNCTION public.get_guild_members(_guild_id uuid)
RETURNS TABLE(user_id uuid, nickname text, avatar_key text, role text, xp int, joined_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.nickname, COALESCE(p.avatar_key,'sparkle'), gm.role, COALESCE(up.xp,0), gm.joined_at
  FROM public.guild_members gm
  JOIN public.users u ON u.id = gm.user_id
  LEFT JOIN public.user_profiles p ON p.user_id = gm.user_id
  LEFT JOIN public.user_progress up ON up.user_id = gm.user_id
  WHERE gm.guild_id = _guild_id ORDER BY gm.role='owner' DESC, COALESCE(up.xp,0) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_my_guild()
RETURNS TABLE(guild_id uuid, name text, description text, color text, role text, member_count int, total_xp int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description, g.color, gm.role,
    (SELECT COUNT(*)::int FROM public.guild_members WHERE guild_id = g.id),
    (SELECT COALESCE(SUM(up.xp),0)::int FROM public.guild_members gm2
       LEFT JOIN public.user_progress up ON up.user_id = gm2.user_id
       WHERE gm2.guild_id = g.id)
  FROM public.guild_members gm
  JOIN public.guilds g ON g.id = gm.guild_id
  WHERE gm.user_id = auth.uid();
$$;

-- =========== STICKER BATTLES ===========
CREATE TABLE IF NOT EXISTS public.sticker_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_date date NOT NULL UNIQUE,
  emoji_a text NOT NULL,
  emoji_b text NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sticker_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battles public read" ON public.sticker_battles FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.sticker_battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.sticker_battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  choice text NOT NULL CHECK (choice IN ('a','b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);
ALTER TABLE public.sticker_battle_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle votes public read" ON public.sticker_battle_votes FOR SELECT USING (true);
CREATE POLICY "users insert own votes" ON public.sticker_battle_votes FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_today_battle()
RETURNS TABLE(id uuid, emoji_a text, emoji_b text, ends_at timestamptz, votes_a int, votes_b int, my_choice text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d date := current_date;
  pool text[][] := ARRAY[
    ARRAY['🐱','🐶'], ARRAY['🍕','🍔'], ARRAY['☀️','🌙'], ARRAY['🌊','🔥'],
    ARRAY['🦄','🐉'], ARRAY['🍦','🍫'], ARRAY['🚀','✈️'], ARRAY['🎮','📚'],
    ARRAY['🎸','🎹'], ARRAY['⚡','❄️'], ARRAY['🌸','🍁'], ARRAY['🥷','🧙']
  ];
  pick text[];
  bid uuid;
  uid uuid := auth.uid();
BEGIN
  SELECT b.id INTO bid FROM public.sticker_battles b WHERE b.battle_date = d;
  IF bid IS NULL THEN
    pick := pool[1 + (abs(hashtext(d::text)) % array_length(pool,1))];
    INSERT INTO public.sticker_battles(battle_date, emoji_a, emoji_b, ends_at)
      VALUES(d, pick[1], pick[2], (d + interval '1 day'))
      ON CONFLICT(battle_date) DO NOTHING
      RETURNING sticker_battles.id INTO bid;
    IF bid IS NULL THEN
      SELECT b.id INTO bid FROM public.sticker_battles b WHERE b.battle_date = d;
    END IF;
  END IF;
  RETURN QUERY
  SELECT b.id, b.emoji_a, b.emoji_b, b.ends_at,
    (SELECT COUNT(*)::int FROM public.sticker_battle_votes v WHERE v.battle_id = b.id AND v.choice='a'),
    (SELECT COUNT(*)::int FROM public.sticker_battle_votes v WHERE v.battle_id = b.id AND v.choice='b'),
    (SELECT v.choice FROM public.sticker_battle_votes v WHERE v.battle_id = b.id AND v.user_id = uid)
  FROM public.sticker_battles b WHERE b.id = bid;
END $$;

-- =========== NOTE CHAINS (threaded comments) ===========
ALTER TABLE public.note_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.note_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_note_comments_parent ON public.note_comments(parent_id);
