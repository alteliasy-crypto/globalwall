import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Bug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestResult {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
  preview?: string;
}

export const QuestSmokeTest = ({ userId }: { userId: string | null }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!userId) return;
    setRunning(true);
    setResults([]);
    const out: TestResult[] = [];

    const time = async (name: string, fn: () => Promise<any>) => {
      const t0 = performance.now();
      try {
        const r = await fn();
        if (r?.error) throw r.error;
        out.push({
          name,
          ok: true,
          ms: Math.round(performance.now() - t0),
          preview: JSON.stringify(r?.data ?? r).slice(0, 80),
        });
      } catch (e: any) {
        out.push({
          name,
          ok: false,
          ms: Math.round(performance.now() - t0),
          error: e?.message ?? String(e),
        });
      }
      setResults([...out]);
    };

    await time("get_my_wallet", () => (supabase as any).rpc("get_my_wallet"));
    await time("get_or_seed_quest_ladder", () =>
      (supabase as any).rpc("get_or_seed_quest_ladder")
    );
    await time("roll_quest", () => (supabase as any).rpc("roll_quest", { _uid: userId }));
    await time("quest_progress_for", () =>
      (supabase as any).rpc("quest_progress_for", {
        _uid: userId,
        _quest_key: "post_note",
        _baseline: 0,
      })
    );

    // complete_quest: only attempt if a ladder quest is actually ready
    const { data: ladder } = await (supabase as any).rpc("get_or_seed_quest_ladder");
    const ready = (ladder ?? []).find((q: any) => q.progress >= q.target);
    if (ready) {
      await time("complete_quest (ready slot)", () =>
        (supabase as any).rpc("complete_quest", { _quest_id: ready.id })
      );
    } else {
      out.push({
        name: "complete_quest (dry-run)",
        ok: true,
        ms: 0,
        preview: "skipped — no quest ready (expected)",
      });
      setResults([...out]);
    }

    setRunning(false);
  };

  const failCount = results.filter((r) => !r.ok).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="Quest RPC smoke test">
          <Bug className="h-4 w-4 text-primary" />
          <span className="hidden font-handwritten text-base sm:inline">Diagnose</span>
          {results.length > 0 && (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 text-[11px] font-bold",
                failCount === 0
                  ? "bg-emerald-500/20 text-emerald-700"
                  : "bg-destructive/20 text-destructive"
              )}
            >
              {failCount === 0 ? "✓" : `${failCount}✗`}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-3">
        <div className="flex items-center justify-between">
          <h4 className="font-handwritten text-xl font-bold">Quest RPC Smoke Test</h4>
          <Button size="sm" onClick={run} disabled={running || !userId} className="h-7 rounded-full text-xs">
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run"}
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Calls every Quest Ladder RPC and surfaces SQL runtime errors.
        </p>
        <div className="mt-3 space-y-1.5">
          {results.length === 0 && !running && (
            <p className="text-xs text-muted-foreground">No results yet. Click Run.</p>
          )}
          {results.map((r) => (
            <div
              key={r.name}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-xs",
                r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold">
                  {r.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  {r.name}
                </span>
                <span className="tabular-nums text-[10px] text-muted-foreground">{r.ms}ms</span>
              </div>
              {r.error && <p className="mt-1 break-words font-mono text-[10px] text-destructive">{r.error}</p>}
              {r.preview && !r.error && (
                <p className="mt-1 break-words font-mono text-[10px] text-muted-foreground">{r.preview}</p>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
