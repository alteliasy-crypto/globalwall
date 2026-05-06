import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { containsProfanity } from "@/lib/profanity";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  nickname?: string;
}

interface Props { noteId: string; userId: string | null }

export const NoteComments = ({ noteId, userId }: Props) => {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [count, setCount] = useState<number>(0);

  const loadCount = async () => {
    const { count } = await supabase
      .from("note_comments").select("*", { count: "exact", head: true }).eq("note_id", noteId);
    setCount(count ?? 0);
  };

  useEffect(() => { void loadCount(); }, [noteId]);

  const load = async () => {
    const { data } = await supabase
      .from("note_comments")
      .select("id, user_id, content, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: true })
      .limit(50);
    const items = (data ?? []) as Comment[];
    const ids = Array.from(new Set(items.map((c) => c.user_id)));
    if (ids.length) {
      const { data: nicks } = await (supabase as any).rpc("get_nicknames", { ids });
      const map = new Map<string, string>(((nicks ?? []) as any[]).map((n: any) => [n.id, n.nickname]));
      items.forEach((c) => { c.nickname = map.get(c.user_id) ?? "?"; });
    }
    setComments(items);
    setCount(items.length);
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const send = async () => {
    if (!userId) { toast.error("Sign in first"); return; }
    const t = draft.trim();
    if (!t) return;
    if (containsProfanity(t)) { toast.error("Keep it kind ✨"); return; }
    const { error } = await supabase.from("note_comments").insert({ note_id: noteId, user_id: userId, content: t });
    if (error) { toast.error(error.message); return; }
    setDraft("");
    void load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("note_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 relative" title="Comments" data-no-drag>
          <MessageSquare className="h-3.5 w-3.5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary text-primary-foreground text-[9px] px-1 font-bold leading-none min-w-3 text-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" data-no-drag onPointerDown={(e) => e.stopPropagation()}>
        <p className="font-handwritten text-xl mb-2">Comments ({count})</p>
        <div className="max-h-60 overflow-y-auto space-y-2 mb-2">
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet — start it off.</p>}
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/40 bg-muted/40 p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs">{c.nickname}</span>
                {c.user_id === userId && (
                  <button onClick={() => del(c.id)} title="Delete">
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
              <p className="mt-1 break-words">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Reply…"
            maxLength={280}
            disabled={!userId}
            className="h-8"
          />
          <Button size="icon" className="h-8 w-8" onClick={send} disabled={!userId || !draft.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
