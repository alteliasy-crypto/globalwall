import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Target, Flame, Check, Gift, Sparkles, Share2, Zap, PartyPopper } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { LevelBar } from "./LevelBar";
import { toast } from "sonner";

interface Props {
  userId: string | null;
}

export const DailyTaskPanel = ({ userId }: Props) => {
  const { progress, task, completeTask, loading, error } = useProgress(userId);

  if (!userId) return null;

  const done = !!task?.completed_at;
  const streak = progress?.streak_days ?? 0;
  const currentBoost = progress?.current_boost_pct ?? 0;
  const tomorrowBoost = progress?.tomorrow_boost_pct ?? 0;
  const tasksDoneToday = progress?.tasks_done_today ?? 0;

  const handleComplete = async () => {
    const r = await completeTask();
    if (r.error) {
      toast.error(r.error.message ?? "Finish the task requirements first.");
      return;
    }
    if (r.awarded) {
      toast.success(`+${r.awardedXp} xp · +1 sticky note slot · ${r.tasksDoneToday} chained today`);
      toast(`Tomorrow's boost is now +${r.tomorrowBoostPct}%`, {
        icon: <PartyPopper className="h-4 w-4 text-primary" />,
      });
    } else {
      toast.info("Task already completed today.");
    }
  };

  const handleShare = async () => {
    const rewardPool = [
      "Mystery confetti burst ✨",
      "Lucky streak charm 🍀",
      "Hype wave unlocked 🌊",
      "Rare cork aura activated 🪩",
      "Golden pin energy charged 📌",
    ];
    const reward = rewardPool[Math.floor(Math.random() * rewardPool.length)];
    const shareData = {
      title: "Global Wall",
      text: "Come pin something on Global Wall — it's chaotic, social, and way too fun.",
      url: window.location.origin,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.origin);
      toast.success(`Shared for a random reward: ${reward}`);
    } catch {
      toast.info("Share canceled — mystery reward saved for your next brave attempt.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-1.5 rounded-full"
          title="Daily task"
        >
          <Target className="h-4 w-4" />
          <span className="hidden font-handwritten text-base sm:inline">Daily</span>
          {!done && task && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          )}
          {streak > 0 && (
            <span className="ml-1 flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
              <Flame className="h-3 w-3" />
              {streak}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/50 bg-muted/40 p-3">
          {progress ? (
            <LevelBar xp={progress.xp} compact />
          ) : (
            <p className="text-xs text-muted-foreground">loading...</p>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-primary" />
              {streak}-day streak
            </span>
            <span className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              +{progress?.bonus_note_slots ?? 0} bonus slots
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border/50 bg-background/70 px-2 py-2">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Now</span>
              </div>
              <p className="font-handwritten text-xl font-bold">+{currentBoost}%</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/70 px-2 py-2">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Tomorrow</span>
              </div>
              <p className="font-handwritten text-xl font-bold">+{tomorrowBoost}%</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/70 px-2 py-2">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Chain</span>
              </div>
              <p className="font-handwritten text-xl font-bold">{tasksDoneToday}</p>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-1 flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Today's task
            </span>
          </div>
          {loading ? (
            <p className="animate-fade-in text-sm text-muted-foreground">spinning up your next challenge...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !task ? (
            <p className="text-sm text-muted-foreground">No task yet — try another action to wake the chain.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-handwritten text-2xl font-bold">{task.task_title}</h3>
                  <p className="font-note text-sm text-foreground">{task.task_description}</p>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="hover-scale inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary transition-colors hover:bg-muted"
                  title="Share website for random reward"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress
                  value={done ? 100 : Math.min(100, (task.progress / task.target) * 100)}
                  className="h-2 flex-1"
                />
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {done ? task.target : task.progress}/{task.target}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Reward: <b>+{Math.ceil(task.xp_reward * (100 + currentBoost) / 100)} xp</b> · +1 sticky slot
                </span>
                {done ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary">
                    <Check className="h-3 w-3" /> Done
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    className="h-7 rounded-full"
                    disabled={task.progress < task.target}
                  >
                    {task.progress >= task.target ? "Claim reward" : "In progress"}
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Finish this and the next measurable task drops instantly. Every task you chain today adds +5% to tomorrow's XP boost.
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
