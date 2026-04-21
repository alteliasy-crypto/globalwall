import { Progress } from "@/components/ui/progress";
import { levelProgress } from "@/hooks/useProgress";
import { Sparkles } from "lucide-react";

interface Props {
  xp: number;
  compact?: boolean;
}

export const LevelBar = ({ xp, compact }: Props) => {
  const { level, into, span, pct } = levelProgress(xp);
  return (
    <div className={compact ? "w-full" : "w-full rounded-xl border border-border/50 bg-muted/40 p-3"}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="flex items-center gap-1 font-handwritten text-base font-bold">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Level {level}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {into} / {span} xp
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {!compact && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Total {xp.toLocaleString()} xp
        </p>
      )}
    </div>
  );
};
