import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NicknameDialog } from "@/components/NicknameDialog";
import { StickyNote, NoteData } from "@/components/StickyNote";
import { Toolbar } from "@/components/Toolbar";
import { NoteColor } from "@/lib/noteColors";
import { toast } from "sonner";

const Index = () => {
  const { user, profile, loading, needsCaptcha, signInWithCaptcha, setNickname } = useAuth();
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [newColor, setNewColor] = useState<NoteColor>("yellow");
  const boardRef = useRef<HTMLDivElement>(null);

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

  // Realtime on the 'wall' channel
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
    const board = boardRef.current?.getBoundingClientRect();
    const x = board ? Math.random() * Math.max(0, board.width - 200) : 80;
    const y = board ? 100 + Math.random() * Math.max(0, board.height - 300) : 100;

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
    // optimistic
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    const { error } = await supabase.from("notes").update(patch).eq("id", id);
    if (error) toast.error(error.message);
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
    if (error) toast.error(error.message);
    else toast.success("Report submitted, thanks!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={boardRef} className="cork-board absolute inset-0 overflow-hidden">
        {notes.map((n) => (
          <StickyNote
            key={n.id}
            note={n}
            authorNickname={nicknames[n.user_id]}
            isOwner={user?.id === n.user_id}
            isAuthed={!!user}
            onDragEnd={onDragEnd}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onReport={reportNote}
            boardRef={boardRef}
          />
        ))}

        {!loading && notes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="font-handwritten text-4xl text-foreground/40">
              An empty wall... be the first to pin something!
            </p>
          </div>
        )}
      </div>

      <Toolbar
        nickname={profile?.nickname ?? null}
        myCount={myNotes.length}
        totalCount={notes.length}
        newColor={newColor}
        setNewColor={setNewColor}
        onAddNote={addNote}
        onSignOut={signOut}
        canAdd={!!profile && !profile.is_banned && myNotes.length < 3}
      />

      {profile?.is_banned && (
        <div className="absolute inset-x-0 top-20 z-20 mx-auto w-fit rounded-full bg-destructive px-4 py-2 text-destructive-foreground shadow-lg">
          You've been banned from posting.
        </div>
      )}

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
