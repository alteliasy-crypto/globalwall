import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NoteColor } from "@/lib/noteColors";
import { Plus, LogOut, HelpCircle, FileText, Trash2, User as UserIcon, Settings as SettingsIcon, Check, StickyNote, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_VERSION, DEV_NOTES } from "@/lib/version";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProfileSearch } from "./ProfileSearch";

interface Props {
  userId: string | null;
  nickname: string | null;
  avatarKey: string | null;
  myCount: number;
  noteCap: number;
  totalCount: number;
  newColor: NoteColor;
  setNewColor: (c: NoteColor) => void;
  onAddNote: () => void;
  onSignOut: () => void;
  onEditProfile: () => void;
  onDeleteAllMine: () => void;
  canAdd: boolean;
  inboxSlot?: React.ReactNode;
  newsSlot?: React.ReactNode;
  favoritesSlot?: React.ReactNode;
  dailySlot?: React.ReactNode;
  marketSlot?: React.ReactNode;
  leaderboardSlot?: React.ReactNode;
  communitySlot?: React.ReactNode;
  colorsSlot?: React.ReactNode;
  deviceMode?: any;
  onDeviceModeChange?: any;
}

const THEME_PRESETS: { key: string; label: string; preview: string }[] = [
  { key: "default", label: "Cork Classic", preview: "from-amber-300 to-amber-600" },
  { key: "matte", label: "Matte Black", preview: "from-zinc-900 to-black" },
  { key: "pastel", label: "Pastel Dream", preview: "from-pink-300 to-purple-400" },
  { key: "neon", label: "Neon Pulse", preview: "from-cyan-400 to-fuchsia-500" },
  { key: "midnight", label: "Midnight Ink", preview: "from-slate-700 to-indigo-900" },
  { key: "sunset", label: "Sunset", preview: "from-orange-400 to-rose-500" },
  { key: "forest", label: "Forest Mist", preview: "from-emerald-500 to-teal-700" },
  { key: "ocean", label: "Ocean Wave", preview: "from-sky-400 to-blue-600" },
  { key: "lava", label: "Lava Flow", preview: "from-red-500 to-orange-600" },
  { key: "galaxy", label: "Galaxy Drift", preview: "from-purple-700 to-indigo-900" },
  { key: "cherry", label: "Cherry Blossom", preview: "from-pink-400 to-rose-300" },
  { key: "aurora", label: "Aurora", preview: "from-green-400 via-cyan-400 to-purple-500" },
  { key: "matrix", label: "Matrix", preview: "from-green-600 to-emerald-900" },
  { key: "candy", label: "Candyland", preview: "from-pink-300 to-yellow-300" },
  { key: "steel", label: "Steel Forge", preview: "from-zinc-500 to-slate-700" },
  { key: "gold", label: "Gold Rush", preview: "from-yellow-400 to-amber-600" },
  { key: "ice", label: "Ice Crystal", preview: "from-cyan-300 to-blue-400" },
  { key: "volcano", label: "Volcano", preview: "from-red-700 to-yellow-500" },
  { key: "meadow", label: "Meadow", preview: "from-lime-400 to-green-500" },
  { key: "void", label: "The Void", preview: "from-black to-zinc-900" },
  { key: "rainbow", label: "Rainbow Wall", preview: "from-red-500 via-yellow-400 to-purple-500" },
];

// Themes everyone has access to (free)
const FREE_THEMES = new Set(["default", "matte", "void"]);

export const Toolbar = ({
  userId, nickname, avatarKey, myCount, noteCap, totalCount, newColor, setNewColor, onAddNote,
  onSignOut, onEditProfile, onDeleteAllMine, canAdd, inboxSlot, newsSlot, favoritesSlot, dailySlot,
  marketSlot, leaderboardSlot, communitySlot, colorsSlot,
}: Props) => {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [ownedThemes, setOwnedThemes] = useState<Set<string>>(new Set(FREE_THEMES));

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: prof }, { data: cos }] = await Promise.all([
        supabase.from("user_profiles").select("theme").eq("user_id", userId).maybeSingle(),
        supabase.from("cosmetics_owned").select("item_key").eq("user_id", userId),
      ]);
      const t = (prof as any)?.theme ?? "default";
      setCurrentTheme(t);
      const owned = new Set<string>(FREE_THEMES);
      for (const r of (cos ?? []) as any[]) {
        if (typeof r.item_key === "string" && r.item_key.startsWith("theme_")) owned.add(r.item_key.slice(6));
      }
      setOwnedThemes(owned);
    })();
    const onChange = () => {
      supabase.from("user_profiles").select("theme").eq("user_id", userId).maybeSingle().then(({ data }) => {
        if (data) setCurrentTheme((data as any).theme ?? "default");
      });
    };
    window.addEventListener("profile:theme-changed", onChange);
    return () => window.removeEventListener("profile:theme-changed", onChange);
  }, [userId]);

  const pickTheme = async (key: string) => {
    if (!userId) return;
    if (!ownedThemes.has(key)) {
      toast.error("Buy this theme in the Wall Market first ✨");
      return;
    }
    // Direct upsert — bypasses equip_cosmetic ownership check for default/free themes.
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, theme: key } as any, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    setCurrentTheme(key);
    window.dispatchEvent(new CustomEvent("profile:theme-changed"));
    toast.success(`Theme: ${key}`);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 p-3">
      <div className="pointer-events-auto mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 rounded-3xl border border-border/40 bg-background/70 px-3 py-2 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2 pl-1">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-md rotate-[-6deg]">
            <StickyNote className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h1 className="font-handwritten text-xl font-bold">Global Wall</h1>
            <p className="text-[10px] font-bold text-muted-foreground">
              {APP_VERSION} · {totalCount} live
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 p-0.5">
            {colorsSlot}
            {leaderboardSlot}
            {communitySlot}
            {marketSlot}
            {favoritesSlot}
            {dailySlot}
            {newsSlot}
            {inboxSlot}
            <ProfileSearch />
          </div>

          <Button
            onClick={onAddNote}
            disabled={!canAdd}
            className="h-9 gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-3 shadow-md hover:shadow-lg"
            title={`${myCount}/${noteCap} notes this hour`}
          >
            <Plus className="h-4 w-4" />
            <span className="font-handwritten text-base">Add note</span>
            <span className="ml-1 rounded-full bg-primary-foreground/25 px-1.5 text-[11px] font-bold tabular-nums">
              {myCount}/{noteCap}
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full border-border/50 pl-1 pr-3">
                <Avatar avatarKey={avatarKey} size="sm" />
                <span className="font-handwritten text-base max-w-[120px] truncate">{nickname ?? "..."}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-handwritten text-base">
                Hi, {nickname ?? "friend"}!
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userId && (
                <Link to={`/u/${userId}`}>
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" /> My profile
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuItem onClick={onEditProfile}>
                <UserIcon className="mr-2 h-4 w-4" /> Edit profile
              </DropdownMenuItem>

              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="font-handwritten text-3xl">Settings</DialogTitle>
                    <DialogDescription className="font-note text-base">
                      Personalize your wall experience.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="theme" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="self-start rounded-full">
                      <TabsTrigger value="theme" className="rounded-full">🎨 Themes</TabsTrigger>
                      <TabsTrigger value="account" className="rounded-full">👤 Account</TabsTrigger>
                      <TabsTrigger value="about" className="rounded-full">ℹ️ About</TabsTrigger>
                    </TabsList>

                    <TabsContent value="theme" className="flex-1 overflow-y-auto mt-3 pr-1">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Click any theme to apply it. Locked themes unlock in the <b>Wall Market</b>.
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {THEME_PRESETS.map((t) => {
                          const owned = ownedThemes.has(t.key);
                          const active = currentTheme === t.key;
                          return (
                            <button
                              key={t.key}
                              onClick={() => pickTheme(t.key)}
                              className={cn(
                                "group relative flex flex-col items-stretch rounded-xl border border-border/40 p-1 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                                active && "ring-2 ring-primary",
                                !owned && "opacity-60",
                              )}
                            >
                              <div className={cn("h-14 rounded-lg bg-gradient-to-br", t.preview)} />
                              <div className="flex items-center justify-between px-1.5 pt-1">
                                <span className="font-handwritten text-sm font-bold leading-tight">{t.label}</span>
                                {active && <Check className="h-3.5 w-3.5 text-primary" />}
                                {!owned && !active && <span className="text-[9px] font-bold uppercase text-muted-foreground">Locked</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="account" className="flex-1 overflow-y-auto mt-3 space-y-3">
                      <div className="rounded-xl border border-border/40 p-3">
                        <h4 className="font-handwritten text-xl">Profile</h4>
                        <p className="text-sm text-muted-foreground">Edit your nickname, avatar and bio.</p>
                        <Button size="sm" className="mt-2" onClick={onEditProfile}>Open editor</Button>
                      </div>
                      <div className="rounded-xl border border-destructive/40 p-3">
                        <h4 className="font-handwritten text-xl text-destructive">Danger zone</h4>
                        <p className="text-sm text-muted-foreground">These actions can't be undone.</p>
                        {myCount > 0 && (
                          <Button size="sm" variant="destructive" className="mt-2 mr-2" onClick={onDeleteAllMine}>
                            Delete all my notes
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="mt-2" onClick={onSignOut}>
                          Sign out / Start over
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="about" className="flex-1 overflow-y-auto mt-3 space-y-2">
                      <p className="font-handwritten text-2xl">Global Wall {APP_VERSION}</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        <li>📌 15 sticky notes per hour (more from quests)</li>
                        <li>🪜 30 active quests, 3 per fire level</li>
                        <li>🛒 Rotating shop refreshes every 6 hours</li>
                        <li>💬 Comment + react on notes</li>
                        <li>🚩 5 reports = author banned</li>
                      </ul>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>

              <DropdownMenuSeparator />

              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <HelpCircle className="mr-2 h-4 w-4" /> How it works
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-handwritten text-3xl">How the wall works</DialogTitle>
                    <DialogDescription className="font-note text-base">
                      <ul className="mt-2 space-y-2 text-foreground">
                        <li>📌 Drop up to <b>15 sticky notes per hour</b> (more as you complete quests).</li>
                        <li>🎨 Pick a color and write up to 140 characters.</li>
                        <li>✋ <b>Drag</b> your own notes anywhere. <b>Double-click</b> to edit.</li>
                        <li>🌍 Everything is <b>live</b> — refresh-free.</li>
                        <li>🚩 Report rule-breakers. 5 reports = banned forever.</li>
                      </ul>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <FileText className="mr-2 h-4 w-4" /> Dev notes ({APP_VERSION})
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-handwritten text-3xl">Developer notes</DialogTitle>
                    <DialogDescription className="font-note text-base">
                      What's new and changing on the wall.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 space-y-5">
                    {DEV_NOTES.map((entry) => (
                      <div key={entry.version} className="rounded-lg border border-border/50 bg-muted/40 p-3">
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="font-handwritten text-2xl font-bold text-primary">{entry.version}</span>
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                        </div>
                        <ul className="space-y-1.5 font-note text-sm text-foreground">
                          {entry.notes.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              {myCount > 0 && (
                <DropdownMenuItem onClick={onDeleteAllMine} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete all my notes
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Start over
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
