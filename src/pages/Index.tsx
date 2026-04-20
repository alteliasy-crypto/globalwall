import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NicknameDialog } from "@/components/NicknameDialog";
import { StickyNote, NoteData } from "@/components/StickyNote";
import { Toolbar } from "@/components/Toolbar";
import { NoteColor } from "@/lib/noteColors";
import { InfiniteCanvas, InfiniteCanvasHandle, ViewTransform } from "@/components/InfiniteCanvas";
import { LiveChat } from "@/components/LiveChat";
import { Inbox } from "@/components/Inbox";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { MAINTENANCE_MODE, APP_VERSION } from "@/lib/version";
import { containsProfanity } from "@/lib/profanity";
import { Button } from "@/components/ui/button";
import { Locate, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user, profile, loading, needsCaptcha, signInWithCaptcha, setNickname, startOver } = useAuth();
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [newColor, setNewColor] = useState<NoteColor>("yellow");
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef<InfiniteCanvasHandle>(null);

  // Load all notes
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Couldn't load wall");
        return;
      }
      setNotes((data ?? []) as NoteData[]);
    })();
  }, [user]);

  // Resolve nicknames for visible notes
  useEffect(() => {
    const missing = Array.from(new Set(notes.map((n) => n.user_id))).filter((id) => !(id in nicknames));
    if (missing.length === 0) return;
    (async () => {
      const { data } = await (supabase as any).rpc("get_nicknames", { ids: missing });
      if (data) {
        setNicknames((prev) => {
          const next = { ...prev };
          for (const row of data as { id: string; nickname: string }[]) next[row.id] = row.nickname;
          return next;
        });
      }
    })();
  }, [notes, nicknames]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("wall")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setNotes((prev) => [...prev.filter((n) => n.id !== (payload.new as NoteData).id), payload.new as NoteData]);
        } else if (payload.eventType === "UPDATE") {
          setNotes((prev) => prev.map((n) => (n.id === (payload.new as NoteData).id ? (payload.new as NoteData) : n)));
        } else if (payload.eventType === "DELETE") {
          setNotes((prev) => prev.filter((n) => n.id !== (payload.old as NoteData).id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const myNotes = useMemo(() => notes.filter((n) => n.user_id === user?.id), [notes, user]);

  const addNote = async () => {
    if (!user || !profile) return;
    if (myNotes.length >= 3) {
      toast.error("You've reached 3 notes — delete one first!");
      return;
    }
    // Drop the new note near the center of the current viewport (in world coords)
    const center = canvasRef.current?.screenToWorld(window.innerWidth / 2, window.innerHeight / 2) ?? { x: 0, y: 0 };
    const x = center.x - 90 + (Math.random() * 80 - 40);
    const y = center.y - 90 + (Math.random() * 80 - 40);

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      content: "Write something nice...",
      color: newColor,
      x,
      y,
    });
    if (error) toast.error(error.message);
  };

  const updateNote = async (id: string, patch: Partial<NoteData>) => {
    if (typeof patch.content === "string" && containsProfanity(patch.content)) {
      toast.error("Please keep it kind — that wording isn't allowed.");
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    const { error } = await supabase.from("notes").update(patch).eq("id", id);
    if (error) {
      if (error.message?.toLowerCase().includes("disallowed")) {
        toast.error("That wording isn't allowed — note not saved.");
      } else {
        toast.error(error.message);
      }
    }
  };

  const onDragEnd = (id: string, x: number, y: number) => updateNote(id, { x, y });

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const reportNote = async (note_id: string, reason: string) => {
    if (!user) return;
    const { error } = await supabase.from("reports").insert({ note_id, reason, reporter_id: user.id });
    if (error) {
      if (error.code === "23505") toast.info("You already reported this note.");
      else toast.error(error.message);
    } else {
      toast.success("Report submitted, thanks!");
    }
  };

  const screenToWorld = (cx: number, cy: number) =>
    canvasRef.current?.screenToWorld(cx, cy) ?? { x: 0, y: 0 };

  if (MAINTENANCE_MODE) return <MaintenanceScreen />;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <InfiniteCanvas ref={canvasRef} onTransformChange={setTransform}>
        {notes.map((n) => (
          <StickyNote
            key={n.id}
            note={n}
            authorNickname={nicknames[n.user_id]}
            isOwner={user?.id === n.user_id}
            isAuthed={!!user}
            currentUserId={user?.id ?? null}
            scale={transform.scale}
            screenToWorld={screenToWorld}
            onDragEnd={onDragEnd}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onReport={reportNote}
          />
        ))}
      </InfiniteCanvas>

      {!loading && notes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="font-handwritten text-4xl text-foreground/40">
            An empty wall... be the first to pin something!
          </p>
        </div>
      )}

      <Toolbar
        nickname={profile?.nickname ?? null}
        myCount={myNotes.length}
        totalCount={notes.length}
        newColor={newColor}
        setNewColor={setNewColor}
        onAddNote={addNote}
        onSignOut={startOver}
        canAdd={!!profile && !profile.is_banned && myNotes.length < 3}
        inboxSlot={<Inbox userId={user?.id ?? null} />}
      />

      {/* Canvas controls */}
      <div className="pointer-events-auto absolute bottom-4 left-4 z-30 flex flex-col gap-1.5 rounded-2xl border border-border/40 bg-background/80 p-1.5 shadow-lg backdrop-blur-md">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => canvasRef.current?.recenter()}
          title="Recenter"
        >
          <Locate className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => canvasRef.current?.zoomBy(1.2)}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => canvasRef.current?.zoomBy(1 / 1.2)}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="px-1 text-center text-[10px] tabular-nums text-muted-foreground">
          {Math.round(transform.scale * 100)}%
        </span>
      </div>

      {/* Version footer */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 font-handwritten text-xs text-foreground/40">
        Global Wall {APP_VERSION}
      </div>

      {profile?.is_banned && (
        <div className="absolute inset-x-0 top-20 z-20 mx-auto w-fit rounded-full bg-destructive px-4 py-2 text-destructive-foreground shadow-lg">
          You've been banned from posting.
        </div>
      )}

      <LiveChat userId={user?.id ?? null} nickname={profile?.nickname ?? null} />

      <NicknameDialog
        open={!loading && (needsCaptcha || (!!user && !profile))}
        needsCaptcha={needsCaptcha}
        onCaptchaVerified={signInWithCaptcha}
        onSubmit={setNickname}
      />
    </div>
  );
};

export default Index;
