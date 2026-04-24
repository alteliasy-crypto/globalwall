import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Star, Locate, Trash2 } from "lucide-react";
import { colorStyle } from "@/lib/noteColors";
import { cn } from "@/lib/utils";

interface FavRow {
  id: string;
  note_id: string;
  notes: {
    id: string;
    content: string;
    color: string;
    user_id: string;
    x: number;
    y: number;
  } | null;
}

interface Props {
  userId: string | null;
  onJumpTo?: (x: number, y: number) => void;
}

export const FavoritesPanel = ({ userId, onJumpTo }: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<FavRow[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  const load = async () => {
    if (!userId) return;
    // Fetch favorites then notes (no FK, manual join)
    const { data: favs } = await supabase
      .from("note_favorites")
      .select("id, note_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!favs || favs.length === 0) {
      setRows([]);
      return;
    }
    const ids = favs.map((f: any) => f.note_id);
    const { data: notes } = await supabase.from("notes").select("*").in("id", ids);
    const noteMap = new Map((notes ?? []).map((n: any) => [n.id, n]));
    const merged: FavRow[] = favs.map((f: any) => ({
      id: f.id,
      note_id: f.note_id,
      notes: noteMap.get(f.note_id) ?? null,
    }));
    setRows(merged);

    const userIds = Array.from(new Set((notes ?? []).map((n: any) => n.user_id)));
    if (userIds.length > 0) {
      const { data } = await (supabase as any).rpc("get_nicknames", { ids: userIds });
      if (data) {
        setNicknames((prev) => {
          const next = { ...prev };
          for (const r of data as { id: string; nickname: string }[]) next[r.id] = r.nickname;
          return next;
        });
      }
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, userId]);

  const remove = async (favId: string) => {
    await supabase.from("note_favorites").delete().eq("id", favId);
    setRows((p) => p.filter((r) => r.id !== favId));
  };

  if (!userId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="Favorites">
          <Star className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="font-handwritten text-lg font-bold">Favorites</span>
          </div>
          <span className="text-xs text-muted-foreground">{rows.length} saved</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="p-6 text-center font-handwritten text-base text-muted-foreground">
              no favorites yet — tap the ⭐ on any note
            </p>
          ) : (
            rows.map((r) => {
              const n = r.notes;
              if (!n) {
                return (
                  <div key={r.id} className="flex items-center justify-between border-b border-border/30 px-3 py-2 last:border-0">
                    <p className="font-handwritten text-sm italic text-muted-foreground">(note was deleted)</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              }
              return (
                <div
                  key={r.id}
                  className={cn(
                    "group flex items-start gap-2 border-b border-border/30 p-2 last:border-0",
                  )}
                >
                  <div style={colorStyle(n.color)} className="h-12 w-12 shrink-0 rounded-sm p-1 text-[9px] leading-tight overflow-hidden">
                    <p className="line-clamp-3 font-note text-foreground">{n.content}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-note text-sm text-foreground">{n.content}</p>
                    <p className="font-handwritten text-xs opacity-60">— {nicknames[n.user_id] ?? "anon"}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Jump to note"
                      onClick={() => { onJumpTo?.(n.x, n.y); setOpen(false); }}
                    >
                      <Locate className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Remove favorite"
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
