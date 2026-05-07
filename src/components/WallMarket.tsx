import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Coins, Gem, Sparkles, Shield, Zap, Palette, Award, Image as FrameIcon, Type, RefreshCw, Check, Crown, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuests, notifyQuestRefresh } from "@/hooks/useQuests";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Item {
  item_key: string;
  category: string;
  type: string;
  label: string;
  description: string;
  coins: number;
  tokens: number;
  rarity: string;
  accent: string;
  meta: any;
  rotates_at?: string;
}

const RARITY_RING: Record<string, string> = {
  common: "ring-slate-300",
  rare: "ring-blue-400",
  epic: "ring-fuchsia-500",
  legendary: "ring-amber-400 shadow-[0_0_24px_-6px_hsl(45_100%_60%/0.6)]",
};

const CAT_ICON: Record<string, any> = {
  theme: Palette, badge: Award, fx: Sparkles, frame: FrameIcon, font: Type, boost: Zap, title: Crown,
};

interface Props { userId: string | null }

export const WallMarket = ({ userId }: Props) => {
  const { wallet, refresh } = useQuests(userId);
  const [busy, setBusy] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [activeBoosts, setActiveBoosts] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<{ theme?: string; badge?: string; fx?: string; frame?: string; font?: string; title?: string }>({});
  const [rotation, setRotation] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [tab, setTab] = useState("rotation");
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadInventory = async () => {
    if (!userId) return;
    const [{ data: cos }, { data: boosts }, { data: prof }] = await Promise.all([
      supabase.from("cosmetics_owned").select("item_key").eq("user_id", userId),
      supabase.from("active_boosts").select("boost_key").eq("user_id", userId).gt("expires_at", new Date().toISOString()),
      supabase.from("user_profiles").select("theme, equipped_badge, equipped_fx, equipped_frame, equipped_font, equipped_title").eq("user_id", userId).maybeSingle(),
    ]);
    setOwned(new Set((cos ?? []).map((r: any) => r.item_key)));
    setActiveBoosts(new Set((boosts ?? []).map((r: any) => r.boost_key)));
    setEquipped({
      theme: (prof as any)?.theme ?? "default",
      badge: (prof as any)?.equipped_badge ?? undefined,
      fx: (prof as any)?.equipped_fx ?? undefined,
      frame: (prof as any)?.equipped_frame ?? undefined,
      font: (prof as any)?.equipped_font ?? undefined,
      title: (prof as any)?.equipped_title ?? undefined,
    });
  };

  const loadShop = async () => {
    const [{ data: rot }, { data: all }] = await Promise.all([
      (supabase as any).rpc("get_shop_rotation"),
      supabase.from("shop_catalog").select("*").order("rarity").order("coins"),
    ]);
    setRotation((rot ?? []) as Item[]);
    setAllItems((all ?? []) as Item[]);
  };

  useEffect(() => { void loadInventory(); void loadShop(); }, [userId]);

  const buy = async (it: Item) => {
    setBusy(it.item_key);
    const { data, error } = await (supabase as any).rpc("purchase_market_item", { _item_key: it.item_key });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const row = (data ?? [])[0];
    if (!row?.success) { toast.error(row?.message ?? "Purchase failed"); return; }
    toast.success(row.message);
    await refresh(); await loadInventory();
    notifyQuestRefresh();
  };

  const equip = async (it: Item) => {
    setBusy(it.item_key);
    const { data, error } = await (supabase as any).rpc("equip_cosmetic", { _item_key: it.item_key });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const row = (data ?? [])[0];
    if (!row?.success) { toast.error(row?.message ?? "Could not equip"); return; }
    toast.success(`Equipped: ${it.label}`);
    await loadInventory();
    window.dispatchEvent(new CustomEvent("profile:theme-changed"));
  };

  const rotatesAt = rotation[0]?.rotates_at ? new Date(rotation[0].rotates_at).getTime() : null;
  const countdown = useMemo(() => {
    if (!rotatesAt) return "";
    const ms = Math.max(0, rotatesAt - now);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }, [rotatesAt, now]);

  const ownedItems = allItems.filter((i) => owned.has(i.item_key) || activeBoosts.has(i.item_key));

  const isEquipped = (it: Item) => {
    if (it.category === "theme") return equipped.theme === it.item_key.replace(/^theme_/, "");
    if (it.category === "badge") return equipped.badge === it.item_key;
    if (it.category === "fx") return equipped.fx === it.item_key;
    if (it.category === "frame") return equipped.frame === it.item_key;
    if (it.category === "font") return equipped.font === it.item_key;
    if (it.category === "title") return equipped.title === it.item_key;
    return false;
  };

  const inRotation = useMemo(() => new Set(rotation.map((r) => r.item_key)), [rotation]);

  const renderCard = (it: Item) => {
    const Icon = CAT_ICON[it.category] ?? Sparkles;
    const isOwned = it.type === "cosmetic" && owned.has(it.item_key);
    const isActive = it.type === "boost" && activeBoosts.has(it.item_key);
    const canAfford = (wallet?.coins ?? 0) >= it.coins && (wallet?.tokens ?? 0) >= it.tokens;
    const equippedNow = isEquipped(it);
    const inRot = inRotation.has(it.item_key);
    return (
      <div
        key={it.item_key}
        className={cn(
          "group relative flex flex-col rounded-2xl border border-border/40 bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-xl ring-1 ring-inset",
          RARITY_RING[it.rarity] ?? "ring-slate-300",
          !canAfford && !isOwned && !isActive && "opacity-70",
        )}
      >
        {!inRot && !isOwned && !isActive && (
          <span className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground backdrop-blur" title="Wait for it to come back into rotation">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        )}
        <div className={cn("mb-3 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-inner", it.accent)}>
          <Icon className="h-9 w-9 drop-shadow" />
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <h4 className="font-handwritten text-lg font-bold leading-tight">{it.label}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{it.rarity}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 font-note text-xs text-muted-foreground">{it.description}</p>
        {equippedNow && (
          <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
            <Check className="h-3 w-3" /> Equipped
          </div>
        )}
        {isActive && !equippedNow && (
          <div className="mt-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-center text-xs font-bold text-emerald-600">Active</div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            {it.coins > 0 && <span className="flex items-center gap-0.5 text-amber-600"><Coins className="h-3 w-3" />{it.coins}</span>}
            {it.tokens > 0 && <span className="flex items-center gap-0.5 text-fuchsia-600"><Gem className="h-3 w-3" />{it.tokens}</span>}
            {it.coins === 0 && it.tokens === 0 && <span className="text-muted-foreground">Free</span>}
          </div>
          {isOwned ? (
            it.category === "boost" ? (
              <span className="text-xs text-muted-foreground">Owned</span>
            ) : (
              <Button size="sm" className="h-7 rounded-full" disabled={busy === it.item_key || equippedNow} onClick={() => equip(it)}>
                {equippedNow ? "On" : "Equip"}
              </Button>
            )
          ) : (
            <Button size="sm" className="h-7 rounded-full" disabled={!canAfford || !inRot || busy === it.item_key} onClick={() => buy(it)} title={!inRot ? "Only items currently in rotation can be bought" : undefined}>
              {busy === it.item_key ? "..." : !inRot ? "Locked" : "Buy"}
            </Button>
          )}
        </div>
      </div>
    );
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
          <DialogDescription className="font-note text-base flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-amber-600"><Coins className="h-4 w-4" />{wallet?.coins ?? 0}</span>
            <span className="flex items-center gap-1 font-bold text-fuchsia-600"><Gem className="h-4 w-4" />{wallet?.tokens ?? 0}</span>
            <span className="text-muted-foreground">· 540+ items · 25 rotate every 6h · rotation-only purchases</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-2">
              <TabsList className="rounded-full">
                <TabsTrigger value="rotation" className="rounded-full">🔥 Rotation</TabsTrigger>
                <TabsTrigger value="theme" className="rounded-full">Themes</TabsTrigger>
                <TabsTrigger value="badge" className="rounded-full">Badges</TabsTrigger>
                <TabsTrigger value="fx" className="rounded-full">FX</TabsTrigger>
                <TabsTrigger value="frame" className="rounded-full">Frames</TabsTrigger>
                <TabsTrigger value="font" className="rounded-full">Fonts</TabsTrigger>
                <TabsTrigger value="title" className="rounded-full">Titles</TabsTrigger>
                <TabsTrigger value="boost" className="rounded-full">Boosts</TabsTrigger>
                <TabsTrigger value="owned" className="rounded-full">My Stuff</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {tab === "rotation" && <span>Refreshes in <b>{countdown}</b></span>}
                <Button size="sm" variant="ghost" className="h-7 rounded-full" onClick={() => { void loadShop(); void loadInventory(); }}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="rotation" className="m-0">
                <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {rotation.map(renderCard)}
                </div>
              </TabsContent>
              {(["theme","badge","fx","frame","font","title","boost"] as const).map((cat) => (
                <TabsContent key={cat} value={cat} className="m-0">
                  <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {allItems.filter((i) => i.category === cat).map(renderCard)}
                  </div>
                </TabsContent>
              ))}
              <TabsContent value="owned" className="m-0">
                {ownedItems.length === 0 ? (
                  <p className="py-12 text-center font-handwritten text-2xl text-muted-foreground">Buy something to see it here ✨</p>
                ) : (
                  <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {ownedItems.map(renderCard)}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
