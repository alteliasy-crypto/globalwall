import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Users, Swords, Trophy, Calendar, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./Avatar";
import { NicknameLink } from "./NicknameLink";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { userId: string | null }

export const CommunityPanel = ({ userId }: Props) => {
  const [tab, setTab] = useState("event");

  // Daily event
  const [event, setEvent] = useState<any>(null);
  const [eventBoard, setEventBoard] = useState<any[]>([]);

  // Sticker battle
  const [battle, setBattle] = useState<any>(null);

  // Guilds
  const [myGuild, setMyGuild] = useState<any>(null);
  const [guildBoard, setGuildBoard] = useState<any[]>([]);
  const [newGuildName, setNewGuildName] = useState("");

  // Level leaderboard
  const [levelBoard, setLevelBoard] = useState<any[]>([]);

  const loadAll = async () => {
    const [evRes, evLb, btl, mg, gb, lvl] = await Promise.all([
      (supabase as any).rpc("get_daily_event"),
      (supabase as any).rpc("get_daily_event_leaderboard", { _limit: 25 }),
      (supabase as any).rpc("get_today_battle"),
      userId ? (supabase as any).rpc("get_my_guild") : Promise.resolve({ data: [] }),
      (supabase as any).rpc("get_guild_leaderboard", { _limit: 25 }),
      (supabase as any).rpc("get_level_leaderboard", { _limit: 50 }),
    ]);
    setEvent((evRes.data ?? [])[0] ?? null);
    setEventBoard(evLb.data ?? []);
    setBattle((btl.data ?? [])[0] ?? null);
    setMyGuild((mg.data ?? [])[0] ?? null);
    setGuildBoard(gb.data ?? []);
    setLevelBoard(lvl.data ?? []);
  };

  useEffect(() => { void loadAll(); }, [userId]);

  const voteBattle = async (choice: "a" | "b") => {
    if (!userId || !battle) return;
    const { error } = await supabase.from("sticker_battle_votes").insert({ battle_id: battle.id, user_id: userId, choice });
    if (error) { toast.error(error.message.includes("duplicate") ? "Already voted!" : error.message); return; }
    toast.success("Voted!");
    void loadAll();
  };

  const createGuild = async () => {
    if (!userId) return;
    const { data, error } = await (supabase as any).rpc("create_guild", { _name: newGuildName, _description: "", _color: "from-amber-400 to-orange-500" });
    if (error) { toast.error(error.message); return; }
    const row = (data ?? [])[0];
    if (!row?.success) { toast.error(row?.message ?? "Failed"); return; }
    toast.success("Guild created!");
    setNewGuildName("");
    void loadAll();
  };

  const joinGuild = async (gid: string) => {
    const { data, error } = await (supabase as any).rpc("join_guild", { _guild_id: gid });
    if (error) { toast.error(error.message); return; }
    const row = (data ?? [])[0];
    if (!row?.success) { toast.error(row?.message ?? "Failed"); return; }
    toast.success("Joined!"); void loadAll();
  };

  const leaveGuild = async () => {
    await (supabase as any).rpc("leave_guild");
    toast.success("Left guild");
    void loadAll();
  };

  const totalVotes = (battle?.votes_a ?? 0) + (battle?.votes_b ?? 0);
  const pctA = totalVotes ? Math.round((battle.votes_a / totalVotes) * 100) : 50;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="Community">
          <Users className="h-4 w-4" />
          <span className="hidden font-handwritten text-base sm:inline">Community</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[88vh] max-h-[88vh] w-[95vw] max-w-3xl overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border/50 p-4">
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Community
          </DialogTitle>
          <DialogDescription className="font-note text-base">
            Daily events, guilds, sticker battles & top-level players.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 self-start rounded-full">
            <TabsTrigger value="event" className="rounded-full"><Calendar className="mr-1 h-3 w-3" />Daily</TabsTrigger>
            <TabsTrigger value="battle" className="rounded-full"><Swords className="mr-1 h-3 w-3" />Battle</TabsTrigger>
            <TabsTrigger value="guilds" className="rounded-full"><Crown className="mr-1 h-3 w-3" />Guilds</TabsTrigger>
            <TabsTrigger value="levels" className="rounded-full"><Trophy className="mr-1 h-3 w-3" />Levels</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="event" className="m-0 space-y-3">
              {event && (
                <div className="rounded-2xl border border-border/40 bg-card p-4">
                  <h3 className="font-handwritten text-2xl font-bold">⚡ {event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.description} · target {event.target}</p>
                </div>
              )}
              <div className="rounded-2xl border border-border/40 bg-card p-3">
                <h4 className="font-handwritten text-xl mb-2">Today's leaders</h4>
                {eventBoard.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Be the first to score!</p>
                ) : eventBoard.map((r: any) => (
                  <div key={r.user_id} className="flex items-center gap-2 py-1">
                    <span className="w-6 text-center text-xs font-bold">{r.rank}</span>
                    <Avatar avatarKey={r.avatar_key} size="sm" />
                    <NicknameLink userId={r.user_id} nickname={r.nickname} className="flex-1 truncate font-handwritten" />
                    <span className="font-bold text-primary">{r.score}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="battle" className="m-0">
              {battle ? (
                <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
                  <p className="font-handwritten text-xl mb-3">Sticker Battle of the Day</p>
                  <div className="flex items-center justify-around gap-4">
                    <button
                      onClick={() => voteBattle("a")}
                      disabled={!!battle.my_choice}
                      className={cn("flex flex-col items-center rounded-2xl p-4 transition-all hover:scale-110",
                        battle.my_choice === "a" && "ring-4 ring-primary")}
                    >
                      <span className="text-7xl">{battle.emoji_a}</span>
                      <span className="mt-1 text-sm font-bold">{battle.votes_a} ({pctA}%)</span>
                    </button>
                    <span className="font-handwritten text-3xl">VS</span>
                    <button
                      onClick={() => voteBattle("b")}
                      disabled={!!battle.my_choice}
                      className={cn("flex flex-col items-center rounded-2xl p-4 transition-all hover:scale-110",
                        battle.my_choice === "b" && "ring-4 ring-primary")}
                    >
                      <span className="text-7xl">{battle.emoji_b}</span>
                      <span className="mt-1 text-sm font-bold">{battle.votes_b} ({100 - pctA}%)</span>
                    </button>
                  </div>
                  {battle.my_choice && <p className="mt-3 text-xs text-muted-foreground">You voted! New battle tomorrow.</p>}
                </div>
              ) : <p className="text-center text-muted-foreground">Loading battle...</p>}
            </TabsContent>

            <TabsContent value="guilds" className="m-0 space-y-3">
              {myGuild ? (
                <div className={cn("rounded-2xl bg-gradient-to-br p-4 text-white", myGuild.color)}>
                  <h3 className="font-handwritten text-2xl font-bold">{myGuild.name}</h3>
                  <p className="text-sm opacity-90">{myGuild.description || "No description"}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>{myGuild.member_count} members · {myGuild.total_xp} XP · You: {myGuild.role}</span>
                    <Button size="sm" variant="secondary" onClick={leaveGuild}>Leave</Button>
                  </div>
                </div>
              ) : userId ? (
                <div className="rounded-2xl border border-border/40 bg-card p-3 flex gap-2">
                  <Input value={newGuildName} onChange={(e) => setNewGuildName(e.target.value)} placeholder="Guild name (3-24 chars)" />
                  <Button onClick={createGuild} disabled={newGuildName.length < 3}>Create</Button>
                </div>
              ) : null}
              <div className="rounded-2xl border border-border/40 bg-card p-3">
                <h4 className="font-handwritten text-xl mb-2">Top guilds</h4>
                {guildBoard.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No guilds yet — start one!</p>
                ) : guildBoard.map((g: any) => (
                  <div key={g.guild_id} className="flex items-center gap-2 py-1">
                    <span className="w-6 text-center text-xs font-bold">{g.rank}</span>
                    <span className={cn("h-6 w-6 rounded-full bg-gradient-to-br", g.color)} />
                    <span className="flex-1 truncate font-handwritten">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{g.member_count} · {g.total_xp} XP</span>
                    {!myGuild && userId && (
                      <Button size="sm" variant="outline" className="h-6 rounded-full" onClick={() => joinGuild(g.guild_id)}>Join</Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="levels" className="m-0">
              <div className="rounded-2xl border border-border/40 bg-card p-3">
                <h4 className="font-handwritten text-xl mb-2">Highest levels</h4>
                {levelBoard.map((r: any) => (
                  <div key={r.user_id} className="flex items-center gap-2 py-1">
                    <span className="w-6 text-center text-xs font-bold">{r.rank}</span>
                    <Avatar avatarKey={r.avatar_key} size="sm" />
                    <NicknameLink userId={r.user_id} nickname={r.nickname} className="flex-1 truncate font-handwritten" />
                    {r.equipped_title && <span className="text-[10px] rounded-full bg-primary/15 px-1.5 text-primary">{r.equipped_title}</span>}
                    <span className="font-bold text-primary">Lv {r.level}</span>
                    <span className="text-xs text-muted-foreground">{r.xp} XP</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
