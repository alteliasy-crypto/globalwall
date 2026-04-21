
-- ============================================================
-- v3.1: XP, Levels, Daily Tasks, Login Streaks
-- ============================================================

-- ---------- user_progress ----------
CREATE TABLE public.user_progress (
  user_id uuid PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_login_date date,
  bonus_note_slots integer NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progress is viewable by everyone"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (true);

-- No direct INSERT/UPDATE policies — all writes go through SECURITY DEFINER funcs.

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- daily_tasks ----------
CREATE TABLE public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_date date NOT NULL,
  task_key text NOT NULL,
  task_title text NOT NULL,
  task_description text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  progress integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 25,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_date)
);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily tasks"
  ON public.daily_tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No direct INSERT/UPDATE — handled by SECURITY DEFINER funcs.

CREATE INDEX idx_daily_tasks_user_date ON public.daily_tasks(user_id, task_date DESC);

-- ============================================================
-- Functions
-- ============================================================

-- Level curve: level = floor(sqrt(xp / 50)) + 1  → 50, 200, 450, 800, 1250...
CREATE OR REPLACE FUNCTION public.calc_level(_xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(GREATEST(_xp, 0) / 50.0))::int + 1);
$$;

-- Assign / fetch today's task + login streak bookkeeping
CREATE OR REPLACE FUNCTION public.get_or_assign_daily_task()
RETURNS TABLE(
  id uuid,
  task_date date,
  task_key text,
  task_title text,
  task_description text,
  target integer,
  progress integer,
  xp_reward integer,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  yesterday_key text;
  prog public.user_progress%ROWTYPE;
  task_pool jsonb := '[
    {"key":"post_note","title":"Leave your mark","desc":"Post 1 sticky note","target":1,"xp":25},
    {"key":"react_3","title":"Spread some love","desc":"React to 3 different notes","target":3,"xp":30},
    {"key":"upvote_5","title":"Lift others up","desc":"Upvote 5 notes","target":5,"xp":35},
    {"key":"favorite_2","title":"Curator","desc":"Favorite 2 notes","target":2,"xp":25},
    {"key":"follow_1","title":"Make a friend","desc":"Follow 1 new user","target":1,"xp":40},
    {"key":"chat_3","title":"Say hi","desc":"Send 3 chat messages","target":3,"xp":20},
    {"key":"visit_profile","title":"Window shopping","desc":"Visit 1 user profile","target":1,"xp":15},
    {"key":"edit_bio","title":"Tell your story","desc":"Update your bio","target":1,"xp":30},
    {"key":"change_avatar","title":"New look","desc":"Change your avatar","target":1,"xp":20},
    {"key":"colorful_note","title":"Add color","desc":"Post a note in any non-yellow color","target":1,"xp":30}
  ]'::jsonb;
  pool_size int;
  pick int;
  chosen jsonb;
  streak_bonus int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Ensure progress row exists
  INSERT INTO public.user_progress (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO prog FROM public.user_progress WHERE user_id = uid FOR UPDATE;

  -- Login streak handling (once per UTC day)
  IF prog.last_login_date IS NULL OR prog.last_login_date < today THEN
    IF prog.last_login_date = today - INTERVAL '1 day' THEN
      prog.streak_days := prog.streak_days + 1;
    ELSE
      prog.streak_days := 1;
    END IF;
    streak_bonus := 5 + LEAST(prog.streak_days, 10) * 2; -- 7 → 25 xp
    UPDATE public.user_progress
      SET last_login_date = today,
          streak_days = prog.streak_days,
          xp = prog.xp + streak_bonus,
          level = public.calc_level(prog.xp + streak_bonus)
      WHERE user_id = uid;
  END IF;

  -- Return existing task if any
  RETURN QUERY
    SELECT t.id, t.task_date, t.task_key, t.task_title, t.task_description,
           t.target, t.progress, t.xp_reward, t.completed_at
    FROM public.daily_tasks t
    WHERE t.user_id = uid AND t.task_date = today;
  IF FOUND THEN RETURN; END IF;

  -- Pick a random task that isn't yesterday's
  SELECT task_key INTO yesterday_key
    FROM public.daily_tasks
    WHERE user_id = uid AND task_date = today - INTERVAL '1 day';

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

  RETURN QUERY
    SELECT t.id, t.task_date, t.task_key, t.task_title, t.task_description,
           t.target, t.progress, t.xp_reward, t.completed_at
    FROM public.daily_tasks t
    WHERE t.user_id = uid AND t.task_date = today;
END;
$$;

-- Mark today's task complete (idempotent)
CREATE OR REPLACE FUNCTION public.complete_daily_task()
RETURNS TABLE(xp integer, level integer, bonus_note_slots integer, awarded boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  task_row public.daily_tasks%ROWTYPE;
  prog public.user_progress%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO task_row FROM public.daily_tasks
    WHERE user_id = uid AND task_date = today FOR UPDATE;

  IF task_row.id IS NULL THEN
    RAISE EXCEPTION 'No daily task assigned yet';
  END IF;

  IF task_row.completed_at IS NOT NULL THEN
    SELECT * INTO prog FROM public.user_progress WHERE user_id = uid;
    RETURN QUERY SELECT prog.xp, prog.level, prog.bonus_note_slots, false;
    RETURN;
  END IF;

  UPDATE public.daily_tasks
    SET progress = task_row.target, completed_at = now()
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
$$;

-- Quick fetch for the current user
CREATE OR REPLACE FUNCTION public.get_my_progress()
RETURNS TABLE(
  xp integer,
  level integer,
  streak_days integer,
  last_login_date date,
  bonus_note_slots integer,
  tasks_completed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_progress (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
    SELECT p.xp, p.level, p.streak_days, p.last_login_date,
           p.bonus_note_slots, p.tasks_completed
    FROM public.user_progress p
    WHERE p.user_id = uid;
END;
$$;

-- ============================================================
-- Update note rule trigger to honor bonus_note_slots
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_note_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record public.users%ROWTYPE;
  note_count INTEGER;
  bonus INTEGER := 0;
  base_limit CONSTANT INTEGER := 3;
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

  SELECT COALESCE(bonus_note_slots, 0) INTO bonus
    FROM public.user_progress WHERE user_id = NEW.user_id;

  SELECT COUNT(*) INTO note_count FROM public.notes WHERE user_id = NEW.user_id;
  IF note_count >= base_limit + COALESCE(bonus, 0) THEN
    RAISE EXCEPTION 'Note limit reached (% max). Complete daily tasks to unlock more!', base_limit + COALESCE(bonus, 0);
  END IF;

  RETURN NEW;
END;
$$;
