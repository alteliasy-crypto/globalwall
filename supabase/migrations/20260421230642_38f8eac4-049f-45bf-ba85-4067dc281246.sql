-- =========================================
-- 1. SECURITY FIX: stop broadcasting reports
-- =========================================
ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;

-- Drop overly-broad realtime policy
DROP POLICY IF EXISTS "Authenticated can receive notes channel" ON realtime.messages;

-- =========================================
-- 2. PRIVATE INBOX NOTIFICATIONS
-- =========================================
CREATE TABLE IF NOT EXISTS public.inbox_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  kind text NOT NULL,            -- 'report' | (future: 'follow', etc.)
  note_id uuid,
  actor_id uuid,                 -- nullable (e.g. reports keep reporter private)
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_inbox_recipient_created
  ON public.inbox_notifications (recipient_id, created_at DESC);

ALTER TABLE public.inbox_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their own notifications"
  ON public.inbox_notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Recipients can mark their own notifications read"
  ON public.inbox_notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Realtime for inbox_notifications (recipient-only via RLS)
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_notifications;
ALTER TABLE public.inbox_notifications REPLICA IDENTITY FULL;

-- Trigger: when a report is filed, write a private notification to the note owner
CREATE OR REPLACE FUNCTION public.notify_note_owner_of_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT user_id INTO owner FROM public.notes WHERE id = NEW.note_id;
  IF owner IS NOT NULL THEN
    INSERT INTO public.inbox_notifications (recipient_id, kind, note_id, actor_id, payload)
    VALUES (owner, 'report', NEW.note_id, NULL, jsonb_build_object('reason_len', length(NEW.reason)));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_note_owner_of_report_trg ON public.reports;
CREATE TRIGGER notify_note_owner_of_report_trg
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_note_owner_of_report();

-- =========================================
-- 3. USER PROFILES
-- =========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY,
  bio text NOT NULL DEFAULT '',
  avatar_key text NOT NULL DEFAULT 'sparkle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bio length cap via trigger (CHECK constraint would also work, but trigger is more flexible)
CREATE OR REPLACE FUNCTION public.validate_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.bio) > 200 THEN
    RAISE EXCEPTION 'Bio too long (max 200 chars)';
  END IF;
  IF NEW.avatar_key !~ '^[a-z0-9_-]{1,32}$' THEN
    RAISE EXCEPTION 'Invalid avatar key';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_user_profile_trg ON public.user_profiles;
CREATE TRIGGER validate_user_profile_trg
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_profile();

-- =========================================
-- 4. FOLLOWS
-- =========================================
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  followed_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows (followed_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can follow as themselves"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow themselves"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- =========================================
-- 5. PUBLIC PROFILE RPC (one round-trip)
-- =========================================
CREATE OR REPLACE FUNCTION public.get_public_profile(target_id uuid)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  bio text,
  avatar_key text,
  joined_at timestamptz,
  warnings int,
  is_banned boolean,
  follower_count int,
  following_count int,
  reports_made int,
  notes_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.nickname,
    COALESCE(p.bio, '') AS bio,
    COALESCE(p.avatar_key, 'sparkle') AS avatar_key,
    u.created_at AS joined_at,
    u.warnings,
    u.is_banned,
    (SELECT COUNT(*)::int FROM public.follows f WHERE f.followed_id = u.id) AS follower_count,
    (SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = u.id) AS following_count,
    (SELECT COUNT(*)::int FROM public.reports r WHERE r.reporter_id = u.id) AS reports_made,
    (SELECT COUNT(*)::int FROM public.notes n WHERE n.user_id = u.id) AS notes_count
  FROM public.users u
  LEFT JOIN public.user_profiles p ON p.user_id = u.id
  WHERE u.id = target_id;
$$;