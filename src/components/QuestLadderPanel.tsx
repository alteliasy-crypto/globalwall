import { forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Flame, Coins, Gem, Zap, Trophy, Sparkles, ArrowUpDown } from "lucide-react";
import { useQuests, type Quest } from "@/hooks/useQuests";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { userId: string | null }

const fireGradient = (n: number) => {
  if (n >= 9) return "from-fuchsia-500 via-rose-500 to-amber-400";
  if (n >= 7) return "from-rose-500 via-orange-500 to-amber-400";
  if (n >= 4) return "from-orange-500 to-amber-400";
  return "from-amber-400 to-yellow-300";
};

const FireBar = forwardRef<HTMLDivElement, { level: number }>(({ level }, ref) => (
  <div ref={ref} className="flex items-center gap-0.5" title={`Fire level ${level}/10`}>
    {Array.from({ length: 10 }).map((_, i) => (
      <Flame
        key={i}
        className={cn(
          "h-3 w-3 transition-colors",
          i < level ? "fill-primary text-primary" : "text-muted-foreground/30"
        )}
      />
    ))}
    <span className="ml-1 text-[10px] font-bold text-primary">{level}/10</span>
  </div>
));
FireBar.displayName = "FireBar";

export const QuestLadderPanel = ({ userId }: Props) => {
  const { quests, wallet, loading, error, completeQuest } = useQuests(userId);
  const [sortMode, setSortMode] = useState<"slot" | "fire-desc" | "fire-asc" | "ready">("slot");
  if (!userId) return null;

  const heat = wallet?.heat_streak ?? 0;
  const mult = wallet?.current_multiplier ?? 1;

  const handleComplete = async (q: Quest) => {
    const r: any = await completeQuest(q.id);
    if (!r.ok) {
      toast.error(r.error?.message ?? "Not finished yet");
      return;
    }
    toast.success(
      `+${r.coins_awarded} 🪙${r.tokens_awarded ? ` · +${r.tokens_awarded} 💎` : ""} · x${Number(r.multiplier).toFixed(2)}`,
      { description: `Heat streak: ${r.heat_streak}🔥 · New quest unlocked!` }
    );
  };

  const readyCount = quests.filter((q) => q.progress >= q.target).length;
  const sortedQuests = [...quests].sort((a, b) => {
    if (sortMode === "fire-desc") return b.fire_level - a.fire_level || a.slot - b.slot;
    if (sortMode === "fire-asc") return a.fire_level - b.fire_level || a.slot - b.slot;
    if (sortMode === "ready") {
      const ar = a.progress >= a.target ? 0 : 1;
      const br = b.progress >= b.target ? 0 : 1;
      return ar - br || a.slot - b.slot;
    }
    return a.slot - b.slot;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-1.5 rounded-full" title="Quest Ladder">
          <Flame className={cn("h-4 w-4", heat >= 4 ? "fill-primary text-primary animate-pulse" : "text-primary")} />
          <span className="hidden font-handwritten text-base sm:inline">Quests</span>
          {readyCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-bounce">
              {readyCount}
            </span>
          )}
          {heat > 0 && (
            <span className="ml-1 flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
              {heat}🔥
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[95vw] max-w-[1200px] overflow-hidden p-0 flex flex-col">
        {/* Header / wallet */}
        <DialogHeader className={cn(
          "border-b border-border/50 p-4 transition-colors",
          heat >= 4 ? "bg-gradient-to-br from-primary/15 via-amber-200/30 to-rose-200/20" : "bg-muted/40"
        )}>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-handwritten text-3xl font-bold leading-none">Quest Ladder</span>
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-full"
              onClick={() => setSortMode((m) => m === "slot" ? "fire-desc" : m === "fire-desc" ? "fire-asc" : m === "fire-asc" ? "ready" : "slot")}
              title="Change sort order"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort: {sortMode === "slot" ? "Slot" : sortMode === "fire-desc" ? "🔥 High→Low" : sortMode === "fire-asc" ? "🔥 Low→High" : "Ready first"}
            </Button>
          </div>
          <DialogDescription className="sr-only">Complete quests to earn coins, tokens, and bonus note slots.</DialogDescription>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2.5">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <Coins className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide">Coins</span>
              </div>
              <p className="font-handwritten text-2xl font-bold tabular-nums">{wallet?.coins ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2.5">
              <div className="flex items-center justify-center gap-1 text-fuchsia-600">
                <Gem className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide">Tokens</span>
              </div>
              <p className="font-handwritten text-2xl font-bold tabular-nums">{wallet?.tokens ?? 0}</p>
            </div>
            <div className={cn(
              "rounded-xl border border-border/50 bg-background/70 px-3 py-2.5",
              heat >= 4 && "ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
            )}>
              <div className="flex items-center justify-center gap-1 text-primary">
                <Zap className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide">Heat</span>
              </div>
              <p className="font-handwritten text-2xl font-bold tabular-nums">
                {heat}🔥 <span className="text-sm">x{mult.toFixed(2)}</span>
              </p>
            </div>
          </div>
          {wallet?.active_boost_key && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[12px] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-bold">Boost active:</span>
              <span>{wallet.active_boost_key.replace(/_/g, " ")}</span>
            </div>
          )}
        </DialogHeader>

        {/* Quests */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-3">
            {loading && <p className="text-sm text-muted-foreground">Spinning the ladder…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && sortedQuests.map((q) => {
              const ready = q.progress >= q.target;
              return (
                <div
                  key={q.id}
                  className={cn(
                    "group rounded-2xl border p-4 transition-all flex flex-col",
                    ready
                      ? "border-primary/60 bg-gradient-to-br from-primary/10 to-amber-200/30 shadow-[0_0_20px_hsl(var(--primary)/0.25)] animate-pulse"
                      : "border-border/50 bg-card/60 hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-7 w-7 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center text-xs font-bold text-white shadow", fireGradient(q.fire_level))}>
                          {q.slot}
                        </div>
                        <h4 className="font-handwritten text-xl font-bold leading-tight truncate">{q.title}</h4>
                      </div>
                      <p className="mt-1 font-note text-sm text-muted-foreground">{q.description}</p>
                      <div className="mt-2"><FireBar level={q.fire_level} /></div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={Math.min(100, (q.progress / q.target) * 100)} className="h-2 flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground">{Math.min(q.progress, q.target)}/{q.target}</span>
                  </div>
                  <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-0.5 font-bold text-amber-600">
                        <Coins className="h-3.5 w-3.5" />+{Math.ceil(q.coin_reward * mult)}
                      </span>
                      {q.token_reward > 0 && (
                        <span className="flex items-center gap-0.5 font-bold text-fuchsia-600">
                          <Gem className="h-3.5 w-3.5" />+{q.token_reward}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className={cn("h-8 rounded-full", ready && "bg-gradient-to-r from-primary to-amber-500 hover:opacity-90")}
                      disabled={!ready}
                      onClick={() => handleComplete(q)}
                    >
                      {ready ? "Claim 🎉" : "Working…"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="pt-4 text-center text-xs text-muted-foreground">
            Chain quests within 30 min to build heat 🔥. High-fire quests (≥4) grow your streak.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
