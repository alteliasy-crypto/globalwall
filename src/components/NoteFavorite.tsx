import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  noteId: string;
  userId: string | null;
}

export const NoteFavorite = ({ noteId, userId }: Props) => {
  const [favId, setFavId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("note_favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("note_id", noteId)
        .maybeSingle();
      if (mounted) setFavId((data as any)?.id ?? null);
    })();
    return () => { mounted = false; };
  }, [noteId, userId]);

  if (!userId) return null;

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    if (favId) {
      const { error } = await supabase.from("note_favorites").delete().eq("id", favId);
      if (error) toast.error(error.message);
      else setFavId(null);
    } else {
      const { data, error } = await supabase
        .from("note_favorites")
        .insert({ user_id: userId, note_id: noteId })
        .select("id")
        .single();
      if (error) toast.error(error.message);
      else setFavId((data as any).id);
    }
    setLoading(false);
  };

  const active = !!favId;
  return (
    <button
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      title={active ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full border transition-all",
        active
          ? "border-amber-500 bg-amber-400/30 text-amber-600"
          : "border-foreground/20 bg-background/50 hover:bg-background/80"
      )}
    >
      <Star className={cn("h-3.5 w-3.5", active && "fill-current")} />
    </button>
  );
};
