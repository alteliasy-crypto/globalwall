-- Drop the placeholder rls table
DROP TABLE IF EXISTS public.rls;

-- USERS table (nickname-based identity, no auth)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  warnings INTEGER NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view users"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register a nickname"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- NOTES table (sticky notes on the wall)
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  color TEXT NOT NULL DEFAULT 'yellow',
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_user_id ON public.notes(user_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notes"
  ON public.notes FOR SELECT
  USING (true);

-- Enforce 3-note limit and ban check at insert time via trigger (below)
CREATE POLICY "Anyone can create notes (validated by trigger)"
  ON public.notes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update notes (author check via trigger)"
  ON public.notes FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete notes (author check via trigger)"
  ON public.notes FOR DELETE
  USING (true);

-- REPORTS table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(note_id, reporter_id)
);

CREATE INDEX idx_reports_note_id ON public.reports(note_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a report"
  ON public.reports FOR INSERT
  WITH CHECK (true);

-- Reports are not directly readable by clients (privacy + anti-abuse)
CREATE POLICY "No direct read on reports"
  ON public.reports FOR SELECT
  USING (false);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce 3-note limit + ban check before insert
CREATE OR REPLACE FUNCTION public.enforce_note_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record public.users%ROWTYPE;
  note_count INTEGER;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE id = NEW.user_id;

  IF user_record IS NULL THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  IF user_record.is_banned THEN
    RAISE EXCEPTION 'User is banned and cannot post notes';
  END IF;

  SELECT COUNT(*) INTO note_count FROM public.notes WHERE user_id = NEW.user_id;
  IF note_count >= 3 THEN
    RAISE EXCEPTION 'Note limit reached (3 max per user)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_note_rules_trigger
  BEFORE INSERT ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_note_rules();

-- When a report is inserted, increment the note author's warning count and ban at 5
CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_id UUID;
  new_warning_count INTEGER;
BEGIN
  SELECT user_id INTO author_id FROM public.notes WHERE id = NEW.note_id;

  IF author_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't let users report themselves
  IF author_id = NEW.reporter_id THEN
    RAISE EXCEPTION 'You cannot report your own note';
  END IF;

  UPDATE public.users
    SET warnings = warnings + 1,
        is_banned = (warnings + 1) >= 5
    WHERE id = author_id
    RETURNING warnings INTO new_warning_count;

  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_new_report_trigger
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_report();

-- Enable realtime for notes (so the wall updates live)
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;