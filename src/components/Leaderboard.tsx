import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Coins, Flame, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./Avatar";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Row {
  rank: number;
  user_id: string;
  nickname: string;
  avatar_key: string;
  coins: number;
  tokens: number;
  heat_streak: number;
  highest_fire_cleared: number;
  total_quests_done: number;
}

export const Leaderboard = ({ userId }: { userId: string | null }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any).rpc("get_wall_street_rankings", { _limit: 50 });
      if (alive) setRows((data ?? []) as Row[]);
    };
    void load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [open]);

  const rankIcon = (r: number) => {
    if (r === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (r === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (r === 3) return <Medal className="h-4 w-4 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground">#{r}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="Wall Street Rankings">
          <Trophy className="h-4 w-4" />
          <span className="hidden font-handwritten text-base sm:inline">Rankings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Wall Street Rankings
          </DialogTitle>
          <DialogDescription className="font-note text-base">
            Live global leaderboard — coins, top fire cleared, heat streak. Refreshes every 15s.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No rankings yet — be the first to climb!</p>}
          {rows.map((r) => (
            <Link
              key={r.user_id}
              to={`/u/${r.user_id}`}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/50 bg-card p-2.5 transition-all hover:border-primary/50 hover:scale-[1.01]",
                r.user_id === userId && "ring-2 ring-primary/50",
                r.rank === 1 && "bg-gradient-to-r from-yellow-100/50 to-amber-100/50 border-yellow-400/50",
                r.rank === 2 && "bg-gradient-to-r from-gray-100/50 to-slate-100/50",
                r.rank === 3 && "bg-gradient-to-r from-amber-100/50 to-orange-100/50"
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center">{rankIcon(r.rank)}</div>
              <Avatar avatarKey={r.avatar_key} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-handwritten text-lg font-bold leading-tight">{r.nickname}</p>
                <p className="text-[10px] text-muted-foreground">{r.total_quests_done} quests done</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-0.5 text-amber-600"><Coins className="h-3 w-3" />{r.coins}</span>
                <span className="flex items-center gap-0.5 text-primary"><Flame className="h-3 w-3" />{r.highest_fire_cleared}</span>
                <span className="flex items-center gap-0.5 text-rose-500">{r.heat_streak}🔥</span>
              </div>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
