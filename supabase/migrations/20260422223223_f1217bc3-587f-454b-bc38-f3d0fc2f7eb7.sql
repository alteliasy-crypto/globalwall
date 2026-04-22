DROP FUNCTION IF EXISTS public.complete_daily_task();
DROP FUNCTION IF EXISTS public.get_my_progress();

CREATE OR REPLACE FUNCTION public.get_task_progress(_uid uuid, _task_key text, _day date)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result integer := 0;
BEGIN
  CASE _task_key
    WHEN 'post_note' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.notes n
      WHERE n.user_id = _uid
        AND (n.created_at AT TIME ZONE 'UTC')::date = _day;
    WHEN 'post_2_notes' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.notes n
      WHERE n.user_id = _uid
        AND (n.created_at AT TIME ZONE 'UTC')::date = _day;
    WHEN 'react_3' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.note_reactions r
      WHERE r.user_id = _uid
        AND (r.created_at AT TIME ZONE 'UTC')::date = _day;
    WHEN 'upvote_5' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.note_votes v
      WHERE v.user_id = _uid
        AND v.kind = 'like'
        AND (v.created_at AT TIME ZONE 'UTC')::date = _day;
    WHEN 'favorite_2' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.note_favorites f
      WHERE f.user_id = _uid
        AND (f.created_at AT TIME ZONE 'UTC')::date = _day;
    WHEN 'follow_1' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.follows f
      WHERE f.follower_id = _uid
        AND (f.created_at AT TIME ZONE 'UTC')::date = _day;
    WHEN 'edit_bio' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.user_profiles p
        WHERE p.user_id = _uid
          AND COALESCE(btrim(p.bio), '') <> ''
          AND (p.updated_at AT TIME ZONE 'UTC')::date = _day
      ) THEN 1 ELSE 0 END INTO result;
    WHEN 'change_avatar' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.user_profiles p
        WHERE p.user_id = _uid
          AND COALESCE(p.avatar_key, 'sparkle') <> 'sparkle'
          AND (p.updated_at AT TIME ZONE 'UTC')::date = _day
      ) THEN 1 ELSE 0 END INTO result;
    WHEN 'colorful_note' THEN
      SELECT COUNT(*)::int INTO result
      FROM public.notes n
      WHERE n.user_id = _uid
        AND n.color <> 'yellow'
        AND (n.created_at AT TIME ZONE 'UTC')::date = _day;
    ELSE
      result := 0;
  END CASE;

  RETURN GREATEST(result, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_xp_boost_pct(_uid uuid, _day date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT LEAST(100, COALESCE((
    SELECT COUNT(*)::int * 5
    FROM public.daily_tasks t
    WHERE t.user_id = _uid
      AND t.completed_at IS NOT NULL
      AND (t.completed_at AT TIME ZONE 'UTC')::date = (_day - 1)
  ), 0));
$function$;

CREATE OR REPLACE FUNCTION public.is_task_assignable(_uid uuid, _task_key text, _day date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  note_cap integer := 3;
  current_notes integer := 0;
BEGIN
  SELECT 3 + COALESCE(p.bonus_note_slots, 0)
    INTO note_cap
  FROM public.user_progress p
  WHERE p.user_id = _uid;

  SELECT COUNT(*)::int INTO current_notes
  FROM public.notes n
  WHERE n.user_id = _uid;

  CASE _task_key
    WHEN 'post_note', 'post_2_notes', 'colorful_note' THEN
      RETURN current_notes < note_cap;
    ELSE
      RETURN true;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_assign_daily_task()
RETURNS TABLE(id uuid, task_date date, task_key text, task_title text, task_description text, target integer, progress integer, xp_reward integer, completed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  existing_task public.daily_tasks%ROWTYPE;
  prog public.user_progress%ROWTYPE;
  streak_bonus int := 0;
  xp_boost_pct int := 0;
  boosted_login_xp int := 0;
  yesterday_key text;
  task_pool jsonb := '[
    {"key":"post_note","title":"Fresh pin","desc":"Post 1 sticky note","target":1,"xp":25},
    {"key":"post_2_notes","title":"Double drop","desc":"Post 2 sticky notes","target":2,"xp":45},
    {"key":"react_3","title":"Spread vibes","desc":"React to 3 notes","target":3,"xp":30},
    {"key":"upvote_5","title":"Hype train","desc":"Upvote 5 notes","target":5,"xp":40},
    {"key":"favorite_2","title":"Treasure hunter","desc":"Favorite 2 notes","target":2,"xp":30},
    {"key":"follow_1","title":"New connection","desc":"Follow 1 new user","target":1,"xp":40},
    {"key":"edit_bio","title":"Main character energy","desc":"Update your bio today","target":1,"xp":35},
    {"key":"change_avatar","title":"Face refresh","desc":"Change your profile picture today","target":1,"xp":25},
    {"key":"colorful_note","title":"Color bomb","desc":"Post 1 non-yellow note","target":1,"xp":35}
  ]'::jsonb;
  chosen jsonb;
  candidate jsonb;
  fallback jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_progress (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO prog
  FROM public.user_progress
  WHERE user_id = uid
  FOR UPDATE;

  IF prog.last_login_date IS NULL OR prog.last_login_date < today THEN
    IF prog.last_login_date = (today - 1) THEN
      prog.streak_days := prog.streak_days + 1;
    ELSE
      prog.streak_days := 1;
    END IF;

    streak_bonus := 5 + LEAST(prog.streak_days, 14) * 2;
    xp_boost_pct := public.get_xp_boost_pct(uid, today);
    boosted_login_xp := CEIL(streak_bonus * (100 + xp_boost_pct) / 100.0);

    UPDATE public.user_progress
      SET last_login_date = today,
          streak_days = prog.streak_days,
          xp = prog.xp + boosted_login_xp,
          level = public.calc_level(prog.xp + boosted_login_xp)
      WHERE user_id = uid;
  END IF;

  UPDATE public.daily_tasks t
  SET progress = LEAST(t.target, public.get_task_progress(uid, t.task_key, today))
  WHERE t.user_id = uid
    AND t.task_date = today
    AND t.completed_at IS NULL;

  SELECT * INTO existing_task
  FROM public.daily_tasks t
  WHERE t.user_id = uid
    AND t.task_date = today
    AND t.completed_at IS NULL
  ORDER BY t.created_at ASC
  LIMIT 1;

  IF existing_task.id IS NOT NULL THEN
    RETURN QUERY
      SELECT existing_task.id, existing_task.task_date, existing_task.task_key, existing_task.task_title,
             existing_task.task_description, existing_task.target, existing_task.progress,
             existing_task.xp_reward, existing_task.completed_at;
    RETURN;
  END IF;

  SELECT t.task_key INTO yesterday_key
  FROM public.daily_tasks t
  WHERE t.user_id = uid
  ORDER BY t.created_at DESC
  LIMIT 1;

  FOR candidate IN
    SELECT value FROM jsonb_array_elements(task_pool)
  LOOP
    IF public.is_task_assignable(uid, candidate->>'key', today) THEN
      IF fallback IS NULL THEN
        fallback := candidate;
      END IF;
      IF yesterday_key IS NULL OR (candidate->>'key') <> yesterday_key THEN
        chosen := candidate;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  chosen := COALESCE(chosen, fallback, task_pool->0);

  INSERT INTO public.daily_tasks (
    user_id, task_date, task_key, task_title, task_description, target, progress, xp_reward
  ) VALUES (
    uid,
    today,
    chosen->>'key',
    chosen->>'title',
    chosen->>'desc',
    (chosen->>'target')::int,
    LEAST((chosen->>'target')::int, public.get_task_progress(uid, chosen->>'key', today)),
    (chosen->>'xp')::int
  )
  RETURNING * INTO existing_task;

  RETURN QUERY
    SELECT existing_task.id, existing_task.task_date, existing_task.task_key, existing_task.task_title,
           existing_task.task_description, existing_task.target, existing_task.progress,
           existing_task.xp_reward, existing_task.completed_at;
END;
$function$;

CREATE FUNCTION public.complete_daily_task()
RETURNS TABLE(xp integer, level integer, bonus_note_slots integer, awarded boolean, awarded_xp integer, current_boost_pct integer, tomorrow_boost_pct integer, tasks_done_today integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  task_row public.daily_tasks%ROWTYPE;
  prog public.user_progress%ROWTYPE;
  xp_boost_pct int := 0;
  tomorrow_boost int := 0;
  gained_xp int := 0;
  done_today int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM public.get_or_assign_daily_task();

  SELECT * INTO task_row
  FROM public.daily_tasks
  WHERE user_id = uid
    AND task_date = today
    AND completed_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF task_row.id IS NULL THEN
    RAISE EXCEPTION 'No active task available';
  END IF;

  task_row.progress := LEAST(task_row.target, public.get_task_progress(uid, task_row.task_key, today));

  UPDATE public.daily_tasks
    SET progress = task_row.progress
  WHERE id = task_row.id;

  IF COALESCE(task_row.progress, 0) < task_row.target THEN
    RAISE EXCEPTION 'Task progress is %/% — finish the task first.', COALESCE(task_row.progress, 0), task_row.target;
  END IF;

  xp_boost_pct := public.get_xp_boost_pct(uid, today);
  gained_xp := CEIL(task_row.xp_reward * (100 + xp_boost_pct) / 100.0);

  UPDATE public.daily_tasks
    SET completed_at = now(),
        progress = task_row.target
  WHERE id = task_row.id;

  UPDATE public.user_progress
    SET xp = user_progress.xp + gained_xp,
        level = public.calc_level(user_progress.xp + gained_xp),
        bonus_note_slots = user_progress.bonus_note_slots + 1,
        tasks_completed = user_progress.tasks_completed + 1
    WHERE user_id = uid
    RETURNING * INTO prog;

  SELECT COUNT(*)::int INTO done_today
  FROM public.daily_tasks t
  WHERE t.user_id = uid
    AND t.completed_at IS NOT NULL
    AND (t.completed_at AT TIME ZONE 'UTC')::date = today;

  tomorrow_boost := LEAST(100, done_today * 5);

  RETURN QUERY
    SELECT prog.xp, prog.level, prog.bonus_note_slots, true, gained_xp, xp_boost_pct, tomorrow_boost, done_today;
END;
$function$;

CREATE FUNCTION public.get_my_progress()
RETURNS TABLE(xp integer, level integer, streak_days integer, last_login_date date, bonus_note_slots integer, tasks_completed integer, current_boost_pct integer, tomorrow_boost_pct integer, tasks_done_today integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_progress (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
    SELECT p.xp,
           p.level,
           p.streak_days,
           p.last_login_date,
           p.bonus_note_slots,
           p.tasks_completed,
           public.get_xp_boost_pct(uid, today) AS current_boost_pct,
           LEAST(100, COALESCE((
             SELECT COUNT(*)::int * 5
             FROM public.daily_tasks t
             WHERE t.user_id = uid
               AND t.completed_at IS NOT NULL
               AND (t.completed_at AT TIME ZONE 'UTC')::date = today
           ), 0)) AS tomorrow_boost_pct,
           COALESCE((
             SELECT COUNT(*)::int
             FROM public.daily_tasks t
             WHERE t.user_id = uid
               AND t.completed_at IS NOT NULL
               AND (t.completed_at AT TIME ZONE 'UTC')::date = today
           ), 0) AS tasks_done_today
    FROM public.user_progress p
    WHERE p.user_id = uid;
END;
$function$;