import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Users, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { containsProfanity, cleanText } from "@/lib/profanity";
import { toast } from "sonner";

interface ChatMsg {
  id: string;
  user_id: string;
  nickname: string;
  text: string;
  ts: number;
}

const TTL_MS = 60_000; // messages disappear after 60s

interface Props {
  userId: string | null;
  nickname: string | null;
}

export const LiveChat = ({ userId, nickname }: Props) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [online, setOnline] = useState(0);
  const [unread, setUnread] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, { nickname: string; ts: number }>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Setup chat channel + presence
  useEffect(() => {
    if (!userId || !nickname) return;
    const ch = supabase.channel("global-chat", {
      config: { presence: { key: userId } },
    });
    channelRef.current = ch;

    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      const m = payload as ChatMsg;
      setMessages((prev) => [...prev, m]);
      setUnread((u) => (open ? 0 : u + 1));
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[m.user_id];
        return next;
      });
    });

    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      const { user_id, nickname: nn } = payload as { user_id: string; nickname: string };
      if (user_id === userId) return;
      setTypingUsers((prev) => ({ ...prev, [user_id]: { nickname: nn, ts: Date.now() } }));
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnline(Object.keys(state).length);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ nickname, online_at: Date.now() });
      }
    });

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [userId, nickname]);

  // Expire old messages + stale typing indicators every second
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setMessages((prev) => prev.filter((m) => now - m.ts < TTL_MS));
      setTypingUsers((prev) => {
        const next: typeof prev = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.ts < 4000) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Autoscroll on new
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !userId || !nickname || !channelRef.current) return;
    if (text.length > 200) return;

    const safe = containsProfanity(text) ? cleanText(text) : text;
    if (safe !== text) toast.warning("Message filtered for inappropriate language");

    const m: ChatMsg = {
      id: crypto.randomUUID(),
      user_id: userId,
      nickname,
      text: safe,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, m]);
    await channelRef.current.send({ type: "broadcast", event: "msg", payload: m });
    setDraft("");
  };

  return (
    <>
      {/* Toggle button — bottom right */}
      <div className="pointer-events-auto fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {!open && (
          <Button
            onClick={() => setOpen(true)}
            className="relative h-12 w-12 rounded-full p-0 shadow-lg"
            title="Open chat"
          >
            <MessageCircle className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        )}

        <div
          className={cn(
            "flex w-80 flex-col rounded-2xl border border-border/40 bg-background/95 shadow-2xl backdrop-blur-md transition-all",
            open ? "h-96 opacity-100" : "pointer-events-none h-0 opacity-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="font-handwritten text-lg font-bold">Live chat</span>
              <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                <Users className="h-3 w-3" /> {online}
              </span>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <p className="mt-8 text-center font-handwritten text-base text-muted-foreground">
                quiet in here... say hi! 👋
                <br />
                <span className="text-xs">messages vanish after 60s</span>
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col", m.user_id === userId && "items-end")}>
                  <span className="font-handwritten text-xs text-muted-foreground">
                    {m.nickname}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-1.5 font-note text-sm",
                      m.user_id === userId
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm bg-muted text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-1.5 border-t border-border/40 p-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="say something nice..."
              maxLength={200}
              className="h-8 font-note"
              disabled={!userId}
            />
            <Button size="icon" onClick={send} disabled={!draft.trim() || !userId} className="h-8 w-8 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
