import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Newspaper, Coins, Gem, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEV_NOTES } from "@/lib/version";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { userId: string | null }

export const NewsPanel = ({ userId }: Props) => {
  const [claimed, setClaimed] = useState<Record<string, { coins: number; tokens: number; xp: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!userId) return;
    const { data } = await (supabase as any).rpc("get_my_news_claims");
    const map: Record<string, any> = {};
    for (const r of (data ?? []) as any[]) {
      map[r.version] = { coins: r.coins_awarded, tokens: r.tokens_awarded, xp: r.xp_awarded };
    }
    setClaimed(map);
  };
  useEffect(() => { void load(); }, [userId]);

  const claim = async (version: string) => {
    if (!userId) return;
    setBusy(version);
    const { data, error } = await (supabase as any).rpc("claim_news_reward", { _version: version });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const row = (data ?? [])[0];
    if (!row?.success) { toast.error(row?.message ?? "Couldn't claim"); return; }
    toast.success(`+${row.coins} 🪙 +${row.tokens} 💎 +${row.xp} XP`);
    void load();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="News & rewards">
          <Newspaper className="h-4 w-4" />
          <span className="hidden font-handwritten text-base sm:inline">News</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[88vh] max-h-[88vh] w-[95vw] max-w-3xl overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border/50 p-4">
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" /> Update News
          </DialogTitle>
          <DialogDescription className="font-note text-base">
            Claim a one-time reward for every release — including all the past versions you missed!
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {DEV_NOTES.map((rel) => {
            const c = claimed[rel.version];
            const isClaimed = !!c;
            return (
              <div key={rel.version} className={cn(
                "rounded-2xl border border-border/40 bg-card p-4 shadow-sm",
                isClaimed && "opacity-80"
              )}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-handwritten text-2xl font-bold">{rel.version}</h3>
                    <p className="text-xs text-muted-foreground">{rel.date}</p>
                  </div>
                  {isClaimed ? (
                    <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
                      <Sparkles className="h-3 w-3" />
                      Claimed: +{c.coins} 🪙 +{c.tokens} 💎 +{c.xp} XP
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1 rounded-full"
                      disabled={!userId || busy === rel.version}
                      onClick={() => claim(rel.version)}
                    >
                      <Gift className="h-3.5 w-3.5" />
                      {busy === rel.version ? "..." : "Claim reward"}
                    </Button>
                  )}
                </div>
                <ul className="space-y-1 text-sm">
                  {rel.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
