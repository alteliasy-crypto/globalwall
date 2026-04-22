import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyDailyTaskRefresh } from "@/hooks/useProgress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_EMOJIS = ["❤️", "🔥", "😂", "😮", "👏", "💯", "🥹", "🎉"];

interface Reaction {
  id: string;
  note_id: string;
  user_id: string;
  emoji: string;
}

interface Props {
  noteId: string;
  userId: string | null;
}

export const NoteReactions = ({ noteId, userId }: Props) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("note_reactions")
        .select("*")
        .eq("note_id", noteId);
      if (mounted && data) setReactions(data as Reaction[]);
    })();

    const ch = supabase
      .channel(`reactions:${noteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_reactions", filter: `note_id=eq.${noteId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReactions((p) => [...p, payload.new as Reaction]);
          } else if (payload.eventType === "DELETE") {
            setReactions((p) => p.filter((r) => r.id !== (payload.old as Reaction).id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [noteId]);

  // Group by emoji
  const grouped = reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
    (acc[r.emoji] ??= []).push(r);
    return acc;
  }, {});

  const toggle = async (emoji: string) => {
    if (!userId) return;
    const mine = reactions.find((r) => r.user_id === userId && r.emoji === emoji);
    if (mine) {
      const { error } = await supabase.from("note_reactions").delete().eq("id", mine.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("note_reactions")
        .insert({ note_id: noteId, user_id: userId, emoji });
      if (error && error.code !== "23505") toast.error(error.message);
      else if (!error) notifyDailyTaskRefresh("daily-task:note-reacted");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1" data-no-drag>
      {Object.entries(grouped).map(([emoji, rs]) => {
        const mine = userId ? rs.some((r) => r.user_id === userId) : false;
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={!userId}
            className={cn(
              "flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-xs transition-all",
              mine
                ? "border-primary bg-primary/20"
                : "border-foreground/15 bg-background/40 hover:bg-background/70"
            )}
          >
            <span>{emoji}</span>
            <span className="font-handwritten text-xs opacity-80">{rs.length}</span>
          </button>
        );
      })}
      {userId && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-foreground/20 bg-background/60 text-xs transition-colors hover:bg-background"
              title="Add reaction"
            >
              <Smile className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1" data-no-drag>
            <div className="flex gap-0.5">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => toggle(e)}
                  className="rounded-md p-1.5 text-lg transition-transform hover:scale-125 hover:bg-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
