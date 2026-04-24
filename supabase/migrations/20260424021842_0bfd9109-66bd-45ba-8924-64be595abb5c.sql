CREATE OR REPLACE FUNCTION public.complete_quest(_quest_id uuid)
 RETURNS TABLE(awarded boolean, coins_awarded integer, tokens_awarded integer, multiplier numeric, heat_streak integer, total_coins integer, total_tokens integer, highest_fire integer, new_quest_id uuid, new_quest_slot smallint, new_quest_key text, new_quest_title text, new_quest_desc text, new_quest_fire smallint, new_quest_target integer, new_quest_coins integer, new_quest_tokens integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  total_c int;
  total_t int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT ql.* INTO q FROM public.quest_ladder ql
    WHERE ql.id = _quest_id AND ql.user_id = uid
    FOR UPDATE;

  IF q.id IS NULL THEN RAISE EXCEPTION 'Quest not found'; END IF;

  live_prog := public.quest_progress_for(uid, q.quest_key, q.baseline);
  IF live_prog < q.target THEN
    RAISE EXCEPTION 'Quest not finished yet';
  END IF;

  -- Heat streak logic: chain if last completion was within 30 minutes
  -- Qualify all columns to avoid ambiguity with OUT params (heat_streak, etc.)
  SELECT uc.last_quest_completed_at, uc.heat_streak, uc.best_streak, uc.highest_fire_cleared
    INTO prev_completed, cur_streak, best, high_fire
  FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

  IF prev_completed IS NULL OR (now() - prev_completed) > interval '30 minutes' THEN
    cur_streak := 0;
  END IF;

  IF q.fire_level >= 4 THEN
    cur_streak := cur_streak + 1;
  END IF;
  best := GREATEST(best, cur_streak);
  high_fire := GREATEST(high_fire, q.fire_level);

  mult := LEAST(3.0, 1.0 + (cur_streak / 2) * 0.25);

  SELECT COALESCE(MAX(b.multiplier), 1.0) INTO active_mult
  FROM public.active_boosts b
  WHERE b.user_id = uid AND b.expires_at > now();
  mult := mult * active_mult;

  c_award := CEIL(q.coin_reward * mult);
  t_award := CASE WHEN q.token_reward > 0 THEN CEIL(q.token_reward * LEAST(mult, 2.0)) ELSE 0 END;

  UPDATE public.user_currency uc
  SET coins = uc.coins + c_award,
      tokens = uc.tokens + t_award,
      heat_streak = cur_streak,
      best_streak = best,
      highest_fire_cleared = high_fire,
      total_quests_done = uc.total_quests_done + 1,
      last_quest_completed_at = now(),
      updated_at = now()
  WHERE uc.user_id = uid
  RETURNING uc.coins, uc.tokens INTO total_c, total_t;

  INSERT INTO public.quest_history (user_id, quest_key, fire_level, coins_awarded, tokens_awarded, multiplier)
    VALUES (uid, q.quest_key, q.fire_level, c_award, t_award, mult);

  rolled := public.roll_quest(uid);
  base_new := public.quest_progress_for(uid, rolled->>'key', 0);

  UPDATE public.quest_ladder ql
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
  WHERE ql.id = _quest_id
  RETURNING ql.id INTO new_id;

  RETURN QUERY
  SELECT true,
         c_award, t_award, mult, cur_streak,
         total_c, total_t,
         high_fire,
         new_id, q.slot,
         (rolled->>'key')::text, (rolled->>'title')::text, (rolled->>'desc')::text,
         (rolled->>'fire')::smallint, (rolled->>'target')::int,
         (rolled->>'coins')::int, (rolled->>'tokens')::int;
END;
$function$;