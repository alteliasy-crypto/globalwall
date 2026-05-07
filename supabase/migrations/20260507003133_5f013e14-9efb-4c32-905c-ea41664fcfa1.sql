
-- Fix equip_cosmetic to strip theme_ prefix when writing to user_profiles.theme
-- so it matches the CSS class .theme-<key>.
CREATE OR REPLACE FUNCTION public.equip_cosmetic(_item_key text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  item public.shop_catalog%ROWTYPE;
  theme_val text;
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
    theme_val := regexp_replace(item.item_key, '^theme_', '');
    UPDATE public.user_profiles SET theme = theme_val, updated_at = now() WHERE user_id = uid;
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
$function$;

-- Fix any users who already equipped a theme_xxx key
UPDATE public.user_profiles SET theme = regexp_replace(theme, '^theme_', '') WHERE theme LIKE 'theme_%';

-- Level leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_level_leaderboard(_limit integer DEFAULT 50)
 RETURNS TABLE(rank integer, user_id uuid, nickname text, avatar_key text, equipped_title text, level integer, xp integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ROW_NUMBER() OVER (ORDER BY up.xp DESC, up.level DESC)::int AS rank,
         u.id, u.nickname, COALESCE(p.avatar_key,'sparkle'), p.equipped_title,
         up.level, up.xp
  FROM public.user_progress up
  JOIN public.users u ON u.id = up.user_id AND u.is_banned = false
  LEFT JOIN public.user_profiles p ON p.user_id = up.user_id
  ORDER BY up.xp DESC, up.level DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

-- More XP sources: award XP when posting a note, voting (like), reacting, favoriting
CREATE OR REPLACE FUNCTION public.award_xp(_uid uuid, _xp int)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, xp, level)
    VALUES (_uid, _xp, public.calc_level(_xp))
  ON CONFLICT (user_id) DO UPDATE
    SET xp = public.user_progress.xp + EXCLUDED.xp,
        level = public.calc_level(public.user_progress.xp + EXCLUDED.xp),
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.xp_on_note() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN PERFORM public.award_xp(NEW.user_id, 5); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.xp_on_react() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN PERFORM public.award_xp(NEW.user_id, 1); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.xp_on_vote() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN IF NEW.kind='like' THEN PERFORM public.award_xp(NEW.user_id, 2); END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.xp_on_favorite() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN PERFORM public.award_xp(NEW.user_id, 1); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_xp_note ON public.notes;
CREATE TRIGGER trg_xp_note AFTER INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.xp_on_note();
DROP TRIGGER IF EXISTS trg_xp_react ON public.note_reactions;
CREATE TRIGGER trg_xp_react AFTER INSERT ON public.note_reactions FOR EACH ROW EXECUTE FUNCTION public.xp_on_react();
DROP TRIGGER IF EXISTS trg_xp_vote ON public.note_votes;
CREATE TRIGGER trg_xp_vote AFTER INSERT ON public.note_votes FOR EACH ROW EXECUTE FUNCTION public.xp_on_vote();
DROP TRIGGER IF EXISTS trg_xp_fav ON public.note_favorites;
CREATE TRIGGER trg_xp_fav AFTER INSERT ON public.note_favorites FOR EACH ROW EXECUTE FUNCTION public.xp_on_favorite();
