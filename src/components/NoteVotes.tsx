import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyDailyTaskRefresh } from "@/hooks/useProgress";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vote {
  id: string;
  note_id: string;
  user_id: string;
  kind: "like" | "dislike";
}

interface Props {
  noteId: string;
  userId: string | null;
  isOwner: boolean;
}

export const NoteVotes = ({ noteId, userId, isOwner }: Props) => {
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("note_votes").select("*").eq("note_id", noteId);
      if (mounted && data) setVotes(data as Vote[]);
    })();
    const ch = supabase
      .channel(`votes:${noteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_votes", filter: `note_id=eq.${noteId}` },
        (payload) => {
          if (payload.eventType === "INSERT") setVotes((p) => [...p, payload.new as Vote]);
          else if (payload.eventType === "UPDATE")
            setVotes((p) => p.map((v) => (v.id === (payload.new as Vote).id ? (payload.new as Vote) : v)));
          else if (payload.eventType === "DELETE")
            setVotes((p) => p.filter((v) => v.id !== (payload.old as Vote).id));
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [noteId]);

  const likes = votes.filter((v) => v.kind === "like").length;
  const dislikes = votes.filter((v) => v.kind === "dislike").length;
  const mine = userId ? votes.find((v) => v.user_id === userId) : null;

  const cast = async (kind: "like" | "dislike") => {
    if (!userId || isOwner) return;
    if (mine?.kind === kind) {
      await supabase.from("note_votes").delete().eq("id", mine.id);
    } else if (mine) {
      const { error } = await supabase.from("note_votes").update({ kind }).eq("id", mine.id);
      if (!error && kind === "like") notifyDailyTaskRefresh("daily-task:note-upvoted");
    } else {
      const { error } = await supabase.from("note_votes").insert({ note_id: noteId, user_id: userId, kind });
      if (!error && kind === "like") notifyDailyTaskRefresh("daily-task:note-upvoted");
    }
  };

  const disabled = !userId;

  return (
    <div className="flex items-center gap-1" data-no-drag>
      <button
        onClick={() => cast("like")}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled}
        title={isOwner ? "Like your note" : "Like"}
        className={cn(
          "flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-all",
          mine?.kind === "like"
            ? "border-green-600 bg-green-500/25 text-green-800 dark:text-green-300"
            : "border-foreground/20 bg-background/50 hover:bg-background/80",
          disabled && "cursor-not-allowed opacity-60 hover:bg-background/50"
        )}
      >
        <ThumbsUp className="h-3 w-3" />
        <span className="font-handwritten text-xs tabular-nums">{likes}</span>
      </button>
      <button
        onClick={() => cast("dislike")}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled}
        title={isOwner ? "Dislike your note" : "Dislike"}
        className={cn(
          "flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-all",
          mine?.kind === "dislike"
            ? "border-destructive bg-destructive/20 text-destructive"
            : "border-foreground/20 bg-background/50 hover:bg-background/80",
          disabled && "cursor-not-allowed opacity-60 hover:bg-background/50"
        )}
      >
        <ThumbsDown className="h-3 w-3" />
        <span className="font-handwritten text-xs tabular-nums">{dislikes}</span>
      </button>
    </div>
  );
};
