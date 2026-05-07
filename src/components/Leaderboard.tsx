import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Coins, Flame, Crown, Medal, Star, MessageSquare, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./Avatar";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WallRow { rank: number; user_id: string; nickname: string; avatar_key: string; coins: number; tokens: number; heat_streak: number; highest_fire_cleared: number; total_quests_done: number; }
interface LevelRow { rank: number; user_id: string; nickname: string; avatar_key: string; equipped_title: string | null; level: number; xp: number; }
interface NoteRow { note_id: string; content: string; color: string; author_id: string; nickname: string; avatar_key: string; like_count: number; comment_count: number; }

const rankIcon = (r: number) => {
  if (r === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
  if (r === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (r === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <span className="text-xs font-bold text-muted-foreground">#{r}</span>;
};

export const Leaderboard = ({ userId }: { userId: string | null }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("wall");
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [wall, setWall] = useState<WallRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      const [w, l, n] = await Promise.all([
        (supabase as any).rpc("get_wall_street_rankings", { _limit: 50 }),
        (supabase as any).rpc("get_level_leaderboard", { _limit: 50 }),
        (supabase as any).rpc("get_top_notes", { _period: period, _limit: 25 }),
      ]);
      if (!alive) return;
      setWall((w.data ?? []) as WallRow[]);
      setLevels((l.data ?? []) as LevelRow[]);
      setNotes((n.data ?? []) as NoteRow[]);
    };
    void load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [open, period]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="Leaderboards">
          <Trophy className="h-4 w-4" />
          <span className="hidden font-handwritten text-base sm:inline">Rankings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[95vw] max-w-[1100px] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border/50 p-4">
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Leaderboards
          </DialogTitle>
          <DialogDescription className="font-note text-base">Live rankings — refreshes every 20s.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-2">
            <TabsList className="rounded-full">
              <TabsTrigger value="wall" className="rounded-full">💰 Wall Street</TabsTrigger>
              <TabsTrigger value="levels" className="rounded-full">⚡ Levels</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-full">⭐ Top Notes</TabsTrigger>
            </TabsList>
            {tab === "notes" && (
              <div className="flex gap-1 rounded-full bg-muted p-0.5">
                {(["day","week","month"] as const).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={cn("rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors", period === p ? "bg-background shadow" : "text-muted-foreground")}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="wall" className="m-0 mx-auto max-w-3xl space-y-2">
              {wall.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No rankings yet.</p>}
              {wall.map((r) => (
                <Link key={r.user_id} to={`/u/${r.user_id}`} className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all hover:border-primary/50 hover:scale-[1.01]",
                  r.user_id === userId && "ring-2 ring-primary/50",
                )}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">{rankIcon(r.rank)}</div>
                  <Avatar avatarKey={r.avatar_key} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-handwritten text-xl font-bold leading-tight">{r.nickname}</p>
                    <p className="text-xs text-muted-foreground">{r.total_quests_done} quests done</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <span className="flex items-center gap-0.5 text-amber-600"><Coins className="h-4 w-4" />{r.coins}</span>
                    <span className="flex items-center gap-0.5 text-primary"><Flame className="h-4 w-4" />{r.highest_fire_cleared}</span>
                  </div>
                </Link>
              ))}
            </TabsContent>
            <TabsContent value="levels" className="m-0 mx-auto max-w-3xl space-y-2">
              {levels.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Earn XP to appear here!</p>}
              {levels.map((r) => (
                <Link key={r.user_id} to={`/u/${r.user_id}`} className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all hover:border-primary/50 hover:scale-[1.01]",
                  r.user_id === userId && "ring-2 ring-primary/50",
                )}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">{rankIcon(r.rank)}</div>
                  <Avatar avatarKey={r.avatar_key} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-handwritten text-xl font-bold leading-tight">{r.nickname}</p>
                    <p className="text-xs text-muted-foreground">Level {r.level}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-primary"><Zap className="h-4 w-4" />{r.xp} XP</span>
                </Link>
              ))}
            </TabsContent>
            <TabsContent value="notes" className="m-0 mx-auto max-w-3xl space-y-2">
              {notes.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No notes in this window yet.</p>}
              {notes.map((n, i) => (
                <div key={n.note_id} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">{rankIcon(i + 1)}</div>
                  <Avatar avatarKey={n.avatar_key} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-handwritten text-base leading-snug line-clamp-3">{n.content}</p>
                    <Link to={`/u/${n.author_id}`} className="text-xs text-muted-foreground hover:underline">— {n.nickname}</Link>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-0.5 text-rose-500"><Star className="h-3.5 w-3.5" />{n.like_count}</span>
                    <span className="flex items-center gap-0.5 text-blue-500"><MessageSquare className="h-3.5 w-3.5" />{n.comment_count}</span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
