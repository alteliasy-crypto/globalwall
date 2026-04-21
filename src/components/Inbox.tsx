import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, ThumbsUp, ThumbsDown, Smile, Flag, Inbox as InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

type ActivityKind = "like" | "dislike" | "reaction" | "report";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  noteId: string;
  notePreview: string;
  actorId: string | null; // null for reports (privacy)
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
  const [actorMeta, setActorMeta] = useState<Record<string, { nickname: string; avatar_key: string }>>({});
  const myNoteIdsRef = useRef<Set<string>>(new Set());
  const myNotePreviewRef = useRef<Record<string, string>>({});
  const lastSeenRef = useRef<number>(Number(localStorage.getItem(STORAGE_KEY) ?? 0));

  // Track which notes are mine
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const loadMyNotes = async () => {
      const { data } = await supabase.from("notes").select("id, content").eq("user_id", userId);
      if (!mounted || !data) return;
      myNoteIdsRef.current = new Set(data.map((n) => n.id));
      myNotePreviewRef.current = Object.fromEntries(data.map((n) => [n.id, n.content]));
    };
    loadMyNotes();

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

  // Load recent activity
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const { data: myNotes } = await supabase.from("notes").select("id, content").eq("user_id", userId);
      const ids = (myNotes ?? []).map((n) => n.id);
      const previews = Object.fromEntries((myNotes ?? []).map((n) => [n.id, n.content]));

      // Load votes & reactions on my notes (likes/dislikes/reactions are public)
      const [votesRes, reactionsRes, notifRes] = await Promise.all([
        ids.length > 0
          ? supabase.from("note_votes").select("*").in("note_id", ids).order("created_at", { ascending: false }).limit(30)
          : Promise.resolve({ data: [] as any[] }),
        ids.length > 0
          ? supabase.from("note_reactions").select("*").in("note_id", ids).order("created_at", { ascending: false }).limit(30)
          : Promise.resolve({ data: [] as any[] }),
        // Private inbox notifications (currently used for reports)
        supabase
          .from("inbox_notifications")
          .select("id, kind, note_id, actor_id, created_at")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
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
      for (const n of (notifRes.data ?? []) as any[]) {
        if (n.kind !== "report") continue;
        initial.push({
          id: `n-${n.id}`,
          kind: "report",
          noteId: n.note_id,
          notePreview: previews[n.note_id] ?? "",
          actorId: null,
          ts: new Date(n.created_at).getTime(),
          read: new Date(n.created_at).getTime() <= lastSeenRef.current,
        });
      }
      initial.sort((a, b) => b.ts - a.ts);
      setItems(initial.slice(0, 50));
    })();
    return () => { mounted = false; };
  }, [userId]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const handle = (kind: "vote" | "reaction" | "report", payload: any) => {
      const row = payload.new;
      if (!row) return;
      // For votes/reactions, gate on my note ids (RLS allows anyone to see them, but we filter)
      if ((kind === "vote" || kind === "reaction") && (!myNoteIdsRef.current.has(row.note_id) || row.user_id === userId)) return;
      // For report notifications, RLS already restricts to recipient_id = me
      if (kind === "report" && row.kind !== "report") return;

      const noteId = row.note_id;
      const preview = myNotePreviewRef.current[noteId] ?? "";
      const ts = new Date(row.created_at).getTime();

      let item: ActivityItem | null = null;
      if (kind === "vote") {
        item = { id: `v-${row.id}`, kind: row.kind, noteId, notePreview: preview, actorId: row.user_id, ts, read: false };
      } else if (kind === "reaction") {
        item = { id: `r-${row.id}`, kind: "reaction", noteId, notePreview: preview, actorId: row.user_id, emoji: row.emoji, ts, read: false };
      } else if (kind === "report") {
        item = { id: `n-${row.id}`, kind: "report", noteId, notePreview: preview, actorId: null, ts, read: false };
      }
      if (item) setItems((prev) => [item!, ...prev.filter((p) => p.id !== item!.id)].slice(0, 50));
    };

    const ch = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_votes" }, (p) => handle("vote", p))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "note_votes" }, (p) => handle("vote", p))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_reactions" }, (p) => handle("reaction", p))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_notifications", filter: `recipient_id=eq.${userId}` }, (p) => handle("report", p))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Resolve actor nicknames + avatars
  useEffect(() => {
    const missing = Array.from(new Set(items.map((i) => i.actorId).filter((id): id is string => !!id && !(id in actorMeta))));
    if (missing.length === 0) return;
    (async () => {
      const [{ data: nicks }, { data: profs }] = await Promise.all([
        (supabase as any).rpc("get_nicknames", { ids: missing }),
        supabase.from("user_profiles").select("user_id, avatar_key").in("user_id", missing),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.avatar_key]));
      setActorMeta((prev) => {
        const next = { ...prev };
        for (const r of (nicks ?? []) as { id: string; nickname: string }[]) {
          next[r.id] = { nickname: r.nickname, avatar_key: (profMap.get(r.id) as string) ?? "sparkle" };
        }
        return next;
      });
    })();
  }, [items, actorMeta]);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markAllRead = () => {
    const now = Date.now();
    lastSeenRef.current = now;
    localStorage.setItem(STORAGE_KEY, String(now));
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  if (!userId) return null;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
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
            items.map((it) => (
              <InboxRow
                key={it.id}
                item={it}
                actorMeta={it.actorId ? actorMeta[it.actorId] : undefined}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

function InboxRow({ item, actorMeta }: { item: ActivityItem; actorMeta?: { nickname: string; avatar_key: string } }) {
  const { kind, notePreview, ts, read, emoji, actorId } = item;
  const when = relativeTime(ts);

  const icon =
    kind === "like" ? <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
    : kind === "dislike" ? <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
    : kind === "report" ? <Flag className="h-3.5 w-3.5 text-destructive" />
    : <Smile className="h-3.5 w-3.5 text-primary" />;

  const actorEl = actorId ? (
    <Link
      to={`/u/${actorId}`}
      className="font-bold underline-offset-2 hover:underline"
    >
      {actorMeta?.nickname ?? "someone"}
    </Link>
  ) : (
    <b>someone</b>
  );

  const text =
    kind === "like" ? <>{actorEl} liked your note</>
    : kind === "dislike" ? <>{actorEl} disliked your note</>
    : kind === "report" ? <>your note was <b>reported</b></>
    : <>{actorEl} reacted {emoji} to your note</>;

  return (
    <div className={cn("flex items-start gap-2 border-b border-border/30 px-3 py-2 last:border-0", !read && "bg-primary/5")}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
        {actorId ? <Avatar avatarKey={actorMeta?.avatar_key} size="xs" /> : <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">{icon}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-note text-sm text-foreground">
          {actorId && <span className="opacity-70">{icon}</span>}
          <span>{text}</span>
        </p>
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
