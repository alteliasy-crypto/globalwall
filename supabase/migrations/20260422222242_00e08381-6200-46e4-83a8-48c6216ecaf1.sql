CREATE OR REPLACE FUNCTION public.get_or_assign_daily_task()
RETURNS TABLE(id uuid, task_date date, task_key text, task_title text, task_description text, target integer, progress integer, xp_reward integer, completed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  yesterday_key text;
  prog public.user_progress%ROWTYPE;
  task_pool jsonb := '[
    {"key":"post_note","title":"Leave your mark","desc":"Post 1 sticky note","target":1,"xp":25},
    {"key":"react_3","title":"Spread some love","desc":"React to 3 notes","target":3,"xp":30},
    {"key":"upvote_5","title":"Lift others up","desc":"Upvote 5 notes","target":5,"xp":35},
    {"key":"favorite_2","title":"Curator","desc":"Favorite 2 notes","target":2,"xp":25},
    {"key":"follow_1","title":"Make a friend","desc":"Follow 1 new user","target":1,"xp":40},
    {"key":"edit_bio","title":"Tell your story","desc":"Update your bio today","target":1,"xp":30},
    {"key":"change_avatar","title":"New look","desc":"Change your avatar today","target":1,"xp":20},
    {"key":"colorful_note","title":"Add color","desc":"Post 1 non-yellow note","target":1,"xp":30}
  ]'::jsonb;
  pool_size int;
  pick int;
  chosen jsonb;
  streak_bonus int;
  computed_progress int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_progress (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO prog FROM public.user_progress WHERE user_id = uid FOR UPDATE;

  IF prog.last_login_date IS NULL OR prog.last_login_date < today THEN
    IF prog.last_login_date = today - 1 THEN
      prog.streak_days := prog.streak_days + 1;
    ELSE
      prog.streak_days := 1;
    END IF;

    streak_bonus := 5 + LEAST(prog.streak_days, 10) * 2;

    UPDATE public.user_progress
      SET last_login_date = today,
          streak_days = prog.streak_days,
          xp = prog.xp + streak_bonus,
          level = public.calc_level(prog.xp + streak_bonus)
      WHERE user_id = uid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.daily_tasks t
    WHERE t.user_id = uid AND t.task_date = today
  ) THEN
    SELECT task_key INTO yesterday_key
      FROM public.daily_tasks
      WHERE user_id = uid AND task_date = today - 1;

    pool_size := jsonb_array_length(task_pool);
    LOOP
      pick := floor(random() * pool_size)::int;
      chosen := task_pool -> pick;
      EXIT WHEN yesterday_key IS NULL OR (chosen->>'key') <> yesterday_key;
    END LOOP;

    INSERT INTO public.daily_tasks (
      user_id, task_date, task_key, task_title, task_description, target, xp_reward
    ) VALUES (
      uid, today,
      chosen->>'key',
      chosen->>'title',
      chosen->>'desc',
      (chosen->>'target')::int,
      (chosen->>'xp')::int
    );
  END IF;

  UPDATE public.daily_tasks t
  SET progress = LEAST(
    t.target,
    CASE t.task_key
      WHEN 'post_note' THEN (
        SELECT COUNT(*)::int
        FROM public.notes n
        WHERE n.user_id = uid
          AND (n.created_at AT TIME ZONE 'UTC')::date = today
      )
      WHEN 'react_3' THEN (
        SELECT COUNT(*)::int
        FROM public.note_reactions r
        WHERE r.user_id = uid
          AND (r.created_at AT TIME ZONE 'UTC')::date = today
      )
      WHEN 'upvote_5' THEN (
        SELECT COUNT(*)::int
        FROM public.note_votes v
        WHERE v.user_id = uid
          AND v.kind = 'like'
          AND (v.created_at AT TIME ZONE 'UTC')::date = today
      )
      WHEN 'favorite_2' THEN (
        SELECT COUNT(*)::int
        FROM public.note_favorites f
        WHERE f.user_id = uid
          AND (f.created_at AT TIME ZONE 'UTC')::date = today
      )
      WHEN 'follow_1' THEN (
        SELECT COUNT(*)::int
        FROM public.follows f
        WHERE f.follower_id = uid
          AND (f.created_at AT TIME ZONE 'UTC')::date = today
      )
      WHEN 'edit_bio' THEN (
        SELECT CASE
          WHEN EXISTS (
            SELECT 1
            FROM public.user_profiles p
            WHERE p.user_id = uid
              AND COALESCE(btrim(p.bio), '') <> ''
              AND (p.updated_at AT TIME ZONE 'UTC')::date = today
          ) THEN 1 ELSE 0 END
      )
      WHEN 'change_avatar' THEN (
        SELECT CASE
          WHEN EXISTS (
            SELECT 1
            FROM public.user_profiles p
            WHERE p.user_id = uid
              AND COALESCE(p.avatar_key, 'sparkle') <> 'sparkle'
              AND (p.updated_at AT TIME ZONE 'UTC')::date = today
          ) THEN 1 ELSE 0 END
      )
      WHEN 'colorful_note' THEN (
        SELECT COUNT(*)::int
        FROM public.notes n
        WHERE n.user_id = uid
          AND n.color <> 'yellow'
          AND (n.created_at AT TIME ZONE 'UTC')::date = today
      )
      ELSE t.progress
    END
  )
  WHERE t.user_id = uid
    AND t.task_date = today;

  RETURN QUERY
    SELECT t.id, t.task_date, t.task_key, t.task_title, t.task_description,
           t.target, t.progress, t.xp_reward, t.completed_at
    FROM public.daily_tasks t
    WHERE t.user_id = uid AND t.task_date = today;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_daily_task()
RETURNS TABLE(xp integer, level integer, bonus_note_slots integer, awarded boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  task_row public.daily_tasks%ROWTYPE;
  prog public.user_progress%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM public.get_or_assign_daily_task();

  SELECT * INTO task_row
  FROM public.daily_tasks
  WHERE user_id = uid AND task_date = today
  FOR UPDATE;

  IF task_row.id IS NULL THEN
    RAISE EXCEPTION 'No daily task assigned yet';
  END IF;

  IF task_row.completed_at IS NOT NULL THEN
    SELECT * INTO prog FROM public.user_progress WHERE user_id = uid;
    RETURN QUERY SELECT prog.xp, prog.level, prog.bonus_note_slots, false;
    RETURN;
  END IF;

  IF COALESCE(task_row.progress, 0) < task_row.target THEN
    RAISE EXCEPTION 'Task progress is %/% — finish the task first.', COALESCE(task_row.progress, 0), task_row.target;
  END IF;

  UPDATE public.daily_tasks
    SET progress = task_row.target,
        completed_at = now()
    WHERE id = task_row.id;

  UPDATE public.user_progress
    SET xp = user_progress.xp + task_row.xp_reward,
        level = public.calc_level(user_progress.xp + task_row.xp_reward),
        bonus_note_slots = user_progress.bonus_note_slots + 1,
        tasks_completed = user_progress.tasks_completed + 1
    WHERE user_id = uid
    RETURNING * INTO prog;

  RETURN QUERY SELECT prog.xp, prog.level, prog.bonus_note_slots, true;
END;
$function$;