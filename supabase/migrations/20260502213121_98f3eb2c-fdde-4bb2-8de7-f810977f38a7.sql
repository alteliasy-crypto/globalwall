ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS favorite_colors text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.check_note_profanity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  norm text;
  compact text;
  bad text;
  bad_words text[] := ARRAY[
    'fuck','fucking','fucker','motherfucker','shit','bullshit','bitch','asshole','bastard','dick','pussy','cock','cunt','slut','whore',
    'fag','faggot','nigger','nigga','retard','retarded','tranny','kike','spic','chink','gook','wetback','coon','beaner','dyke',
    'rape','rapist','molest','molester','pedo','pedophile','porn','porno','nude','nudes','sex','horny','onlyfans','blowjob','handjob',
    'kill yourself','kill urself','kys','suicide','hang yourself','die loser','go die',
    'hitler','nazi','swastika',
    'discord.gg','telegram.me','t.me/','http://','https://','www.'
  ];
BEGIN
  norm := lower(COALESCE(NEW.content, ''));
  norm := translate(norm, '0134@5$7+89!|', 'oieaassttbgiil');
  norm := regexp_replace(norm, '(.)\1{2,}', '\1\1', 'g');
  norm := regexp_replace(norm, '[^a-z0-9/:. ]', '', 'g');
  compact := regexp_replace(norm, '[^a-z0-9]', '', 'g');

  FOREACH bad IN ARRAY bad_words LOOP
    IF bad LIKE '% %' THEN
      IF norm LIKE '%' || bad || '%' THEN
        RAISE EXCEPTION 'Note contains disallowed language';
      END IF;
    ELSIF bad LIKE '%/%' OR bad LIKE '%.%' THEN
      IF norm LIKE '%' || bad || '%' THEN
        RAISE EXCEPTION 'Note contains disallowed language';
      END IF;
    ELSE
      IF compact LIKE '%' || regexp_replace(bad, '[^a-z0-9]', '', 'g') || '%' THEN
        RAISE EXCEPTION 'Note contains disallowed language';
      END IF;
    END IF;
  END LOOP;

  IF norm ~ '(.)\1{9,}' OR length(compact) > 0 AND compact = repeat(substr(compact, 1, 1), length(compact)) AND length(compact) >= 12 THEN
    RAISE EXCEPTION 'Note looks like spam';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS check_note_profanity_trigger ON public.notes;
CREATE TRIGGER check_note_profanity_trigger
  BEFORE INSERT OR UPDATE OF content ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.check_note_profanity();

CREATE OR REPLACE FUNCTION public.get_or_seed_quest_ladder()
RETURNS TABLE(id uuid, slot smallint, quest_key text, title text, description text, fire_level smallint, target integer, progress integer, coin_reward integer, token_reward integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  s smallint;
  rolled jsonb;
  baseline_val int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  INSERT INTO public.user_currency (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;

  FOR s IN 1..20 LOOP
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
$function$;

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

  c_cost := (item->>'coins')::int;
  t_cost := (item->>'tokens')::int;

  SELECT uc.coins, uc.tokens INTO cur_coins, cur_tokens
    FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

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
    VALUES (uid, _item_key)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.active_boosts (user_id, boost_key, multiplier, expires_at)
    VALUES (uid, _item_key, (item->>'mult')::numeric, now() + ((item->>'minutes')::int || ' minutes')::interval);
  END IF;

  RETURN QUERY SELECT true, 'Purchased: ' || (item->>'label'), cur_coins, cur_tokens;
END;
$function$;