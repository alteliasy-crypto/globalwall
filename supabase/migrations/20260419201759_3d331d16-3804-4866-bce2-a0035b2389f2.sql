-- Reactions on notes (custom emoji per user per note)
CREATE TABLE public.note_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (note_id, user_id, emoji)
);

ALTER TABLE public.note_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON public.note_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authed users can add their own reactions"
  ON public.note_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
  ON public.note_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_note_reactions_note ON public.note_reactions(note_id);

-- Allow public to see note created_at (already in row, just ensuring select policy already true)
-- Add the table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_reactions;