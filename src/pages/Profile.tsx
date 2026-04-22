import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserPlus, UserMinus, Pencil, Flag, ShieldAlert, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { colorClass } from "@/lib/noteColors";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { LevelBar } from "@/components/LevelBar";
import { calcLevel, notifyDailyTaskRefresh } from "@/hooks/useProgress";

interface PublicProfile {
  user_id: string;
  nickname: string;
  bio: string;
  avatar_key: string;
  joined_at: string;
  warnings: number;
  is_banned: boolean;
  follower_count: number;
  following_count: number;
  reports_made: number;
  notes_count: number;
}

interface PublicNote {
  id: string;
  content: string;
  color: string;
  created_at: string;
  x: number;
  y: number;
}

interface FollowRow {
  follower_id: string;
  followed_id: string;
}

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: myUserRow, setNickname } = useAuth();
  const myExtras = useMyProfile(user?.id ?? null);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [followNicks, setFollowNicks] = useState<Record<string, { nickname: string; avatar_key: string }>>({});
  const [userProgress, setUserProgress] = useState<{ xp: number; level: number; streak_days: number; bonus_note_slots: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMe = !!user && user.id === id;

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: n }, { data: f }, { data: prog }] = await Promise.all([
      (supabase as any).rpc("get_public_profile", { target_id: id }),
      supabase.from("notes").select("id, content, color, created_at, x, y").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("follows").select("follower_id, followed_id").or(`follower_id.eq.${id},followed_id.eq.${id}`),
      supabase.from("user_progress").select("xp, level, streak_days, bonus_note_slots").eq("user_id", id).maybeSingle(),
    ]);
    setProfile(((p ?? []) as PublicProfile[])[0] ?? null);
    setNotes((n ?? []) as PublicNote[]);
    setFollows((f ?? []) as FollowRow[]);
    setUserProgress(prog ? { xp: prog.xp ?? 0, level: prog.level ?? calcLevel(prog.xp ?? 0), streak_days: prog.streak_days ?? 0, bonus_note_slots: prog.bonus_note_slots ?? 0 } : { xp: 0, level: 1, streak_days: 0, bonus_note_slots: 0 });
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // Resolve nicknames + avatars for follower/following lists
  useEffect(() => {
    const otherIds = Array.from(new Set(
      follows.flatMap((f) => [f.follower_id, f.followed_id])
    )).filter((u) => !(u in followNicks));
    if (otherIds.length === 0) return;
    (async () => {
      const [{ data: nicks }, { data: profs }] = await Promise.all([
        (supabase as any).rpc("get_nicknames", { ids: otherIds }),
        supabase.from("user_profiles").select("user_id, avatar_key").in("user_id", otherIds),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.avatar_key]));
      const next: Record<string, { nickname: string; avatar_key: string }> = {};
      for (const r of (nicks ?? []) as any[]) {
        next[r.id] = { nickname: r.nickname, avatar_key: (profMap.get(r.id) as string) ?? "sparkle" };
      }
      setFollowNicks((prev) => ({ ...prev, ...next }));
    })();
  }, [follows, followNicks]);

  const followers = useMemo(() => follows.filter((f) => f.followed_id === id).map((f) => f.follower_id), [follows, id]);
  const following = useMemo(() => follows.filter((f) => f.follower_id === id).map((f) => f.followed_id), [follows, id]);
  const iFollow = !!user && followers.includes(user.id);

  const toggleFollow = async () => {
    if (!user || !id || isMe) return;
    if (iFollow) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", id);
      if (error) toast.error(error.message);
      else setFollows((p) => p.filter((f) => !(f.follower_id === user.id && f.followed_id === id)));
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, followed_id: id });
      if (error) toast.error(error.message);
      else {
        setFollows((p) => [...p, { follower_id: user.id, followed_id: id }]);
        notifyDailyTaskRefresh("daily-task:user-followed");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="font-handwritten text-2xl text-muted-foreground">loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="font-handwritten text-3xl">user not found</p>
        <Button onClick={() => navigate("/")} variant="outline">Back to wall</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="cork-board fixed inset-0 opacity-15" />
      <div className="relative mx-auto max-w-3xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to wall
        </Button>

        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar avatarKey={profile.avatar_key} size="xl" ring />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-handwritten text-4xl font-bold">{profile.nickname}</h1>
                {profile.is_banned && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                    banned
                  </span>
                )}
              </div>
              <p className="font-handwritten text-sm text-muted-foreground">
                joined {new Date(profile.joined_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </p>
              {profile.bio && (
                <p className="mt-3 whitespace-pre-wrap font-note text-base text-foreground">{profile.bio}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {isMe ? (
                  <Button onClick={() => setEditOpen(true)} className="gap-1.5 rounded-full">
                    <Pencil className="h-4 w-4" /> Edit profile
                  </Button>
                ) : user ? (
                  <Button onClick={toggleFollow} variant={iFollow ? "outline" : "default"} className="gap-1.5 rounded-full">
                    {iFollow ? <><UserMinus className="h-4 w-4" /> Unfollow</> : <><UserPlus className="h-4 w-4" /> Follow</>}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Level / streak */}
          {userProgress && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <LevelBar xp={userProgress.xp} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-handwritten text-2xl font-bold leading-none tabular-nums">
                      {userProgress.streak_days}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">day streak</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 font-handwritten text-lg font-bold tabular-nums">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Lv {userProgress.level}
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    +{userProgress.bonus_note_slots} slots
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="notes" value={profile.notes_count} />
            <Stat label="followers" value={profile.follower_count} />
            <Stat label="following" value={profile.following_count} />
            <Stat
              label="warnings"
              value={profile.warnings}
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              tone={profile.warnings > 0 ? "warn" : undefined}
            />
            <Stat
              label="reports filed"
              value={profile.reports_made}
              icon={<Flag className="h-3.5 w-3.5" />}
            />
          </div>
        </div>

        <Tabs defaultValue="notes" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notes">Notes ({profile.notes_count})</TabsTrigger>
            <TabsTrigger value="followers">Followers ({profile.follower_count})</TabsTrigger>
            <TabsTrigger value="following">Following ({profile.following_count})</TabsTrigger>
          </TabsList>

          <TabsContent value="notes">
            {notes.length === 0 ? (
              <p className="py-12 text-center font-handwritten text-xl text-muted-foreground">
                no notes on the wall yet
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "rounded-sm p-3 shadow-md transition-transform hover:-rotate-1 hover:scale-105",
                      colorClass(n.color)
                    )}
                  >
                    <p className="line-clamp-6 whitespace-pre-wrap break-words font-note text-sm text-foreground">
                      {n.content}
                    </p>
                    <p className="mt-2 text-[10px] opacity-60">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers">
            <UserList ids={followers} resolve={followNicks} emptyText="no followers yet" />
          </TabsContent>

          <TabsContent value="following">
            <UserList ids={following} resolve={followNicks} emptyText="not following anyone" />
          </TabsContent>
        </Tabs>
      </div>

      {isMe && myUserRow && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          initialNickname={myUserRow.nickname}
          initialBio={myExtras.bio}
          initialAvatarKey={myExtras.avatar_key}
          onSaveNickname={async (nick) => {
            const r = await setNickname(nick);
            if (!r.error) load();
            return r;
          }}
          onSaveExtras={async (patch) => {
            const r = await myExtras.save(patch);
            if (!r.error) load();
            return r;
          }}
        />
      )}
    </div>
  );
};

function Stat({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone?: "warn" }) {
  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-center",
      tone === "warn" && "border-destructive/30 bg-destructive/5"
    )}>
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="font-handwritten text-2xl font-bold tabular-nums">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function UserList({
  ids,
  resolve,
  emptyText,
}: {
  ids: string[];
  resolve: Record<string, { nickname: string; avatar_key: string }>;
  emptyText: string;
}) {
  if (ids.length === 0) {
    return <p className="py-12 text-center font-handwritten text-xl text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ids.map((uid) => {
        const r = resolve[uid];
        return (
          <Link
            key={uid}
            to={`/u/${uid}`}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-2 transition-colors hover:bg-card"
          >
            <Avatar avatarKey={r?.avatar_key} size="md" />
            <span className="font-handwritten text-lg">{r?.nickname ?? "..."}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default Profile;
