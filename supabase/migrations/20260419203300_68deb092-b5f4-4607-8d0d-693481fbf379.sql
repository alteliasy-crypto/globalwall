-- Likes / dislikes on notes (one vote per user per note)
CREATE TABLE public.note_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('like','dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (note_id, user_id)
);

ALTER TABLE public.note_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes"
  ON public.note_votes FOR SELECT
  USING (true);

CREATE POLICY "Authed users can insert their own vote"
  ON public.note_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own vote"
  ON public.note_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own vote"
  ON public.note_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_note_votes_note ON public.note_votes(note_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.note_votes;