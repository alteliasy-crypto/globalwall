-- Fix duplicate report trigger
DROP TRIGGER IF EXISTS handle_new_report_trigger ON public.reports;
-- keep trg_handle_new_report (BEFORE INSERT) as the canonical one

-- Favorites table
CREATE TABLE IF NOT EXISTS public.note_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_id)
);
ALTER TABLE public.note_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.note_favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can add their own favorites"
  ON public.note_favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove their own favorites"
  ON public.note_favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Server-side profanity check on notes (auto-reject so it can never persist)
CREATE OR REPLACE FUNCTION public.check_note_profanity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
  bad text;
  bad_words text[] := ARRAY[
    'fuck','shit','bitch','asshole','bastard','dick','pussy','cock',
    'cunt','slut','whore','fag','faggot','nigger','nigga','retard',
    'retarded','tranny','kike','spic','chink','gook','wetback',
    'rape','rapist','kys','porn'
  ];
BEGIN
  -- normalize: lowercase, strip non-letters, collapse repeats
  norm := lower(NEW.content);
  norm := translate(norm, '0134@5$7+89!', 'oieaassttbgi');
  norm := regexp_replace(norm, '(.)\1{2,}', '\1\1', 'g');
  norm := regexp_replace(norm, '[^a-z]', '', 'g');

  FOREACH bad IN ARRAY bad_words LOOP
    IF norm LIKE '%' || bad || '%' THEN
      RAISE EXCEPTION 'Note contains disallowed language';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_note_profanity_trigger ON public.notes;
CREATE TRIGGER check_note_profanity_trigger
  BEFORE INSERT OR UPDATE OF content ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.check_note_profanity();