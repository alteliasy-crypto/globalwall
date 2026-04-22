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
    WHEN 'post_note', 'colorful_note' THEN
      RETURN current_notes <= note_cap - 1;
    WHEN 'post_2_notes' THEN
      RETURN current_notes <= note_cap - 2;
    ELSE
      RETURN true;
  END CASE;
END;
$function$;