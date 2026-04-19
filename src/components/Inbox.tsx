import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, ThumbsUp, ThumbsDown, Smile, Flag, Inbox as InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityKind = "like" | "dislike" | "reaction" | "report";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  noteId: string;
  notePreview: string;
  actorId: string | null; // hidden for reports (privacy)
  emoji?: string;
  ts: number;
  read: boolean;
}

interface Props {
  userId: string | null;
}

const STORAGE_KEY = "wall:inbox:lastSeen";

export const Inbox = ({ userId }: Props) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const myNoteIdsRef = useRef<Set<string>>(new Set());
  const myNotePreviewRef = useRef<Record<string, string>>({});
  const lastSeenRef = useRef<number>(Number(localStorage.getItem(STORAGE_KEY) ?? 0));

  // Track which notes are mine so we can filter activity
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const loadMyNotes = async () => {
      const { data } = await supabase
        .from("notes")
        .select("id, content")
        .eq("user_id", userId);
      if (!mounted || !data) return;
      myNoteIdsRef.current = new Set(data.map((n) => n.id));
      myNotePreviewRef.current = Object.fromEntries(data.map((n) => [n.id, n.content]));
    };
    loadMyNotes();

    // Subscribe to my notes changes (so new notes are tracked)
    const noteCh = supabase
      .channel(`inbox-notes:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const n = payload.new as { id: string; content: string };
            myNoteIdsRef.current.add(n.id);
            myNotePreviewRef.current[n.id] = n.content;
          } else if (payload.eventType === "DELETE") {
            const n = payload.old as { id: string };
            myNoteIdsRef.current.delete(n.id);
            delete myNotePreviewRef.current[n.id];
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(noteCh);
    };
  }, [userId]);

  // Load recent activity on my notes (last 50)
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const { data: myNotes } = await supabase.from("notes").select("id, content").eq("user_id", userId);
      if (!mounted || !myNotes || myNotes.length === 0) return;
      const ids = myNotes.map((n) => n.id);
      const previews = Object.fromEntries(myNotes.map((n) => [n.id, n.content]));

      const [votesRes, reactionsRes, reportsRes] = await Promise.all([
        supabase.from("note_votes").select("*").in("note_id", ids).order("created_at", { ascending: false }).limit(30),
        supabase.from("note_reactions").select("*").in("note_id", ids).order("created_at", { ascending: false }).limit(30),
        supabase.from("reports").select("id, note_id, created_at").in("note_id", ids).order("created_at", { ascending: false }).limit(20),
      ]);

      if (!mounted) return;

      const initial: ActivityItem[] = [];
      for (const v of (votesRes.data ?? []) as any[]) {
        if (v.user_id === userId) continue;
        initial.push({
          id: `v-${v.id}`,
          kind: v.kind,
          noteId: v.note_id,
          notePreview: previews[v.note_id] ?? "",
          actorId: v.user_id,
          ts: new Date(v.created_at).getTime(),
          read: new Date(v.created_at).getTime() <= lastSeenRef.current,
        });
      }
      for (const r of (reactionsRes.data ?? []) as any[]) {
        if (r.user_id === userId) continue;
        initial.push({
          id: `r-${r.id}`,
          kind: "reaction",
          noteId: r.note_id,
          notePreview: previews[r.note_id] ?? "",
          actorId: r.user_id,
          emoji: r.emoji,
          ts: new Date(r.created_at).getTime(),
          read: new Date(r.created_at).getTime() <= lastSeenRef.current,
        });
      }
      for (const rep of (reportsRes.data ?? []) as any[]) {
        initial.push({
          id: `rep-${rep.id}`,
          kind: "report",
          noteId: rep.note_id,
          notePreview: previews[rep.note_id] ?? "",
          actorId: null,
          ts: new Date(rep.created_at).getTime(),
          read: new Date(rep.created_at).getTime() <= lastSeenRef.current,
        });
      }
      initial.sort((a, b) => b.ts - a.ts);
      setItems(initial.slice(0, 50));
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Realtime subscriptions for new activity on ANY of my notes
  useEffect(() => {
    if (!userId) return;
    const handle = (kind: "vote" | "reaction" | "report", payload: any) => {
      const row = payload.new;
      if (!row || !myNoteIdsRef.current.has(row.note_id)) return;
      if ((kind === "vote" || kind === "reaction") && row.user_id === userId) return; // ignore self

      const preview = myNotePreviewRef.current[row.note_id] ?? "";
      const ts = new Date(row.created_at).getTime();

      let item: ActivityItem | null = null;
      if (kind === "vote") {
        item = {
          id: `v-${row.id}`,
          kind: row.kind,
          noteId: row.note_id,
          notePreview: preview,
          actorId: row.user_id,
          ts,
          read: false,
        };
      } else if (kind === "reaction") {
        item = {
          id: `r-${row.id}`,
          kind: "reaction",
          noteId: row.note_id,
          notePreview: preview,
          actorId: row.user_id,
          emoji: row.emoji,
          ts,
          read: false,
        };
      } else if (kind === "report") {
        item = {
          id: `rep-${row.id}`,
          kind: "report",
          noteId: row.note_id,
          notePreview: preview,
          actorId: null,
          ts,
          read: false,
        };
      }
      if (item) setItems((prev) => [item!, ...prev].slice(0, 50));
    };

    const ch = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_votes" }, (p) => handle("vote", p))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "note_votes" }, (p) => handle("vote", p))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_reactions" }, (p) => handle("reaction", p))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (p) => handle("report", p))
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  // Resolve nicknames for actors
  useEffect(() => {
    const missing = Array.from(
      new Set(items.map((i) => i.actorId).filter((id): id is string => !!id && !(id in nicknames)))
    );
    if (missing.length === 0) return;
    (async () => {
      const { data } = await (supabase as any).rpc("get_nicknames", { ids: missing });
      if (data) {
        setNicknames((prev) => {
          const next = { ...prev };
          for (const r of data as { id: string; nickname: string }[]) next[r.id] = r.nickname;
          return next;
        });
      }
    })();
  }, [items, nicknames]);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markAllRead = () => {
    const now = Date.now();
    lastSeenRef.current = now;
    localStorage.setItem(STORAGE_KEY, String(now));
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  if (!userId) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markAllRead();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 rounded-full" title="Inbox">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-4 w-4 text-primary" />
            <span className="font-handwritten text-lg font-bold">Inbox</span>
          </div>
          <span className="text-xs text-muted-foreground">{items.length} total</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center font-handwritten text-base text-muted-foreground">
              nothing yet — your notes haven't gotten reactions
            </p>
          ) : (
            items.map((it) => <InboxRow key={it.id} item={it} actorName={it.actorId ? nicknames[it.actorId] : undefined} />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

function InboxRow({ item, actorName }: { item: ActivityItem; actorName?: string }) {
  const { kind, notePreview, ts, read, emoji } = item;
  const when = relativeTime(ts);

  const icon =
    kind === "like" ? <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
    : kind === "dislike" ? <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
    : kind === "report" ? <Flag className="h-3.5 w-3.5 text-destructive" />
    : <Smile className="h-3.5 w-3.5 text-primary" />;

  const text =
    kind === "like" ? <><b>{actorName ?? "someone"}</b> liked your note</>
    : kind === "dislike" ? <><b>{actorName ?? "someone"}</b> disliked your note</>
    : kind === "report" ? <>your note was <b>reported</b></>
    : <><b>{actorName ?? "someone"}</b> reacted {emoji} to your note</>;

  return (
    <div className={cn("flex items-start gap-2 border-b border-border/30 px-3 py-2 last:border-0", !read && "bg-primary/5")}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-note text-sm text-foreground">{text}</p>
        {notePreview && (
          <p className="truncate font-handwritten text-xs text-muted-foreground">"{notePreview}"</p>
        )}
        <p className="text-[10px] text-muted-foreground/80">{when}</p>
      </div>
      {!read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );
}

function relativeTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
