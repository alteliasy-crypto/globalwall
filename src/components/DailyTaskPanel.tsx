import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Target, Flame, Check, Gift } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { LevelBar } from "./LevelBar";
import { toast } from "sonner";

interface Props {
  userId: string | null;
}

export const DailyTaskPanel = ({ userId }: Props) => {
  const { progress, task, completeTask, loading } = useProgress(userId);

  if (!userId) return null;

  const done = !!task?.completed_at;
  const streak = progress?.streak_days ?? 0;

  const handleComplete = async () => {
    const r = await completeTask();
    if (r.error) {
      toast.error(r.error.message);
      return;
    }
    if (r.awarded) {
      toast.success(`+${task?.xp_reward ?? 0} xp · +1 sticky note slot 🎉`);
    } else {
      toast.info("Task already completed today.");
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
        </div>

        <div className="p-3">
          <div className="mb-1 flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Today's task
            </span>
          </div>
          {loading || !task ? (
            <p className="text-sm text-muted-foreground">picking your task...</p>
          ) : (
            <>
              <h3 className="font-handwritten text-2xl font-bold">{task.task_title}</h3>
              <p className="font-note text-sm text-foreground">{task.task_description}</p>
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
                  Reward: <b>+{task.xp_reward} xp</b> · +1 sticky slot
                </span>
                {done ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary">
                    <Check className="h-3 w-3" /> Done
                  </span>
                ) : (
                  <Button size="sm" onClick={handleComplete} className="h-7 rounded-full">
                    Mark complete
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Honor system for now — tap "Mark complete" once you've done it. New task drops every UTC midnight.
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
