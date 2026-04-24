import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ShoppingBag, Coins, Gem, Sparkles, Shield, Zap, Palette, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuests, notifyQuestRefresh } from "@/hooks/useQuests";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Item {
  key: string;
  label: string;
  desc: string;
  coins: number;
  tokens: number;
  type: "cosmetic" | "boost";
  icon: any;
  accent: string;
}

const ITEMS: Item[] = [
  { key: "boost_2x_30m", label: "2x Coin Boost", desc: "Doubles coin rewards for 30 minutes", coins: 250, tokens: 0, type: "boost", icon: Zap, accent: "from-amber-400 to-orange-500" },
  { key: "boost_3x_15m", label: "3x Mega Boost", desc: "Triples rewards for 15 minutes", coins: 0, tokens: 2, type: "boost", icon: Zap, accent: "from-fuchsia-500 to-rose-500" },
  { key: "streak_shield", label: "Streak Shield", desc: "Protects your heat streak for 2 hours", coins: 150, tokens: 0, type: "boost", icon: Shield, accent: "from-blue-400 to-indigo-500" },
  { key: "fx_sparkle", label: "Sparkle Pin FX", desc: "Sparkle effect on your sticky notes", coins: 250, tokens: 0, type: "cosmetic", icon: Sparkles, accent: "from-yellow-300 to-amber-400" },
  { key: "fx_confetti", label: "Confetti Pin FX", desc: "Confetti burst when you pin", coins: 300, tokens: 0, type: "cosmetic", icon: Sparkles, accent: "from-pink-400 to-rose-500" },
  { key: "theme_pastel", label: "Pastel Dream Theme", desc: "Soft pastel cork board", coins: 400, tokens: 0, type: "cosmetic", icon: Palette, accent: "from-pink-300 to-purple-400" },
  { key: "theme_neon", label: "Neon Pulse Theme", desc: "Vibrant neon wall theme", coins: 400, tokens: 0, type: "cosmetic", icon: Palette, accent: "from-cyan-400 to-fuchsia-500" },
  { key: "badge_gold", label: "Gold Wall Badge", desc: "Show off on your profile", coins: 600, tokens: 1, type: "cosmetic", icon: Award, accent: "from-yellow-400 to-amber-500" },
  { key: "badge_diamond", label: "Diamond Badge", desc: "The ultimate flex", coins: 0, tokens: 5, type: "cosmetic", icon: Award, accent: "from-cyan-300 to-blue-500" },
];

interface Props { userId: string | null }

export const WallMarket = ({ userId }: Props) => {
  const { wallet, refresh } = useQuests(userId);
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (item: Item) => {
    setBusy(item.key);
    const { data, error } = await (supabase as any).rpc("purchase_market_item", { _item_key: item.key });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const row = (data ?? [])[0];
    if (!row?.success) { toast.error(row?.message ?? "Purchase failed"); return; }
    toast.success(row.message);
    await refresh();
    notifyQuestRefresh();
  };

  if (!userId) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="Wall Market">
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden font-handwritten text-base sm:inline">Market</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[95vw] max-w-[1400px] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border/50 p-4">
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Wall Market
          </DialogTitle>
          <DialogDescription className="font-note text-base flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-amber-600"><Coins className="h-4 w-4" />{wallet?.coins ?? 0}</span>
            <span className="flex items-center gap-1 font-bold text-fuchsia-600"><Gem className="h-4 w-4" />{wallet?.tokens ?? 0}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {ITEMS.map((it) => {
              const Icon = it.icon;
              const canAfford = (wallet?.coins ?? 0) >= it.coins && (wallet?.tokens ?? 0) >= it.tokens;
              return (
                <div key={it.key} className={cn(
                  "group rounded-2xl border border-border/50 bg-card p-4 transition-all hover:scale-[1.02] hover:shadow-lg",
                  !canAfford && "opacity-60"
                )}>
                  <div className={cn("mb-3 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-inner", it.accent)}>
                    <Icon className="h-9 w-9" />
                  </div>
                  <h4 className="font-handwritten text-xl font-bold leading-tight">{it.label}</h4>
                  <p className="mt-1 font-note text-sm text-muted-foreground">{it.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      {it.coins > 0 && <span className="flex items-center gap-0.5 text-amber-600"><Coins className="h-3.5 w-3.5" />{it.coins}</span>}
                      {it.tokens > 0 && <span className="flex items-center gap-0.5 text-fuchsia-600"><Gem className="h-3.5 w-3.5" />{it.tokens}</span>}
                    </div>
                    <Button size="sm" className="h-8 rounded-full" disabled={!canAfford || busy === it.key} onClick={() => buy(it)}>
                      {busy === it.key ? "..." : "Buy"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="pt-4 text-center text-xs text-muted-foreground">Boosts stack with your heat streak. More items dropping soon 👀</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
