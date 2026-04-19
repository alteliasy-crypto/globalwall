
-- =========================
-- NOTES: ownership policies
-- =========================
DROP POLICY IF EXISTS "Anyone can create notes (validated by trigger)" ON public.notes;
DROP POLICY IF EXISTS "Anyone can delete notes (author check via trigger)" ON public.notes;
DROP POLICY IF EXISTS "Anyone can update notes (author check via trigger)" ON public.notes;
DROP POLICY IF EXISTS "Anyone can view notes" ON public.notes;

CREATE POLICY "Public can view notes"
  ON public.notes FOR SELECT
  USING (true);

CREATE POLICY "Authors can insert their own notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors can update their own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors can delete their own notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- USERS: owner-only access to moderation state
-- ============================================
DROP POLICY IF EXISTS "Anyone can register a nickname" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- Each user row id must equal the auth uid of the session creating it
CREATE POLICY "Users can insert their own row"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view their own full row"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own nickname"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Public-safe view: only id + nickname, no warnings / ban state
CREATE OR REPLACE VIEW public.public_users
WITH (security_invoker = true)
AS
SELECT id, nickname, created_at
FROM public.users;

GRANT SELECT ON public.public_users TO anon, authenticated;

-- Allow the view to read rows regardless of the underlying users RLS
-- by adding a permissive SELECT policy gated to only the safe columns
-- via a SECURITY DEFINER function used by the view.
-- (Simpler: switch the view to security definer-ish via a function.)
CREATE OR REPLACE FUNCTION public.get_public_users()
RETURNS TABLE (id uuid, nickname text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nickname, created_at FROM public.users;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_users() TO anon, authenticated;

-- Replace the view to use the function so it works under invoker RLS
DROP VIEW IF EXISTS public.public_users;
CREATE VIEW public.public_users AS
SELECT * FROM public.get_public_users();

GRANT SELECT ON public.public_users TO anon, authenticated;

-- =========================
-- REPORTS: signed-in only
-- =========================
DROP POLICY IF EXISTS "Anyone can submit a report" ON public.reports;
DROP POLICY IF EXISTS "No direct read on reports" ON public.reports;

CREATE POLICY "Authenticated users can submit reports as themselves"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- No SELECT/UPDATE/DELETE policies => no access (RLS denies by default)

-- Prevent duplicate reports (one report per user per note)
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_per_user_note
  ON public.reports (reporter_id, note_id);

-- =========================================
-- Update enforce_note_rules to trust auth.uid()
-- =========================================
CREATE OR REPLACE FUNCTION public.enforce_note_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record public.users%ROWTYPE;
  note_count INTEGER;
BEGIN
  -- Force user_id to the authenticated caller
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

  SELECT COUNT(*) INTO note_count FROM public.notes WHERE user_id = NEW.user_id;
  IF note_count >= 3 THEN
    RAISE EXCEPTION 'Note limit reached (3 max per user)';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_note_rules ON public.notes;
CREATE TRIGGER trg_enforce_note_rules
  BEFORE INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_note_rules();

-- ===========================================
-- handle_new_report: forces reporter = auth.uid()
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  author_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to report';
  END IF;
  NEW.reporter_id := auth.uid();

  SELECT user_id INTO author_id FROM public.notes WHERE id = NEW.note_id;
  IF author_id IS NULL THEN
    RAISE EXCEPTION 'Note does not exist';
  END IF;

  IF author_id = NEW.reporter_id THEN
    RAISE EXCEPTION 'You cannot report your own note';
  END IF;

  UPDATE public.users
    SET warnings = warnings + 1,
        is_banned = (warnings + 1) >= 5
    WHERE id = author_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_handle_new_report ON public.reports;
CREATE TRIGGER trg_handle_new_report
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_report();

-- ====================================================
-- Realtime: restrict subscriptions to authenticated only
-- ====================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive notes channel" ON realtime.messages;
CREATE POLICY "Authenticated can receive notes channel"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);
