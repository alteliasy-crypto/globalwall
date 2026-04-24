
-- 1) Fix roll_quest: scope ORDER BY/LIMIT inside its own subquery
CREATE OR REPLACE FUNCTION public.roll_quest(_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  FOR i IN 1..12 LOOP
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

-- 2) Drop legacy daily-task system (replaced by Quest Ladder)
DROP FUNCTION IF EXISTS public.get_or_assign_daily_task() CASCADE;
DROP FUNCTION IF EXISTS public.complete_daily_task() CASCADE;
DROP FUNCTION IF EXISTS public.get_task_progress(uuid, text, date) CASCADE;
DROP FUNCTION IF EXISTS public.is_task_assignable(uuid, text, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_xp_boost_pct(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_progress() CASCADE;
DROP TABLE IF EXISTS public.daily_tasks CASCADE;

-- 3) Helpful index for ladder lookups
CREATE INDEX IF NOT EXISTS idx_quest_ladder_user_slot
  ON public.quest_ladder(user_id, slot);
CREATE INDEX IF NOT EXISTS idx_quest_history_user_completed
  ON public.quest_history(user_id, completed_at DESC);
