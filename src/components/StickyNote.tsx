import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "./ColorPicker";
import { Button } from "@/components/ui/button";
import { Trash2, Flag, Check, X, Palette } from "lucide-react";
import { colorClass, NoteColor, rotationFor } from "@/lib/noteColors";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface NoteData {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  user_id: string;
}

interface Props {
  note: NoteData;
  authorNickname?: string;
  isOwner: boolean;
  isAuthed: boolean;
  onDragEnd: (id: string, x: number, y: number) => void;
  onUpdate: (id: string, patch: Partial<Pick<NoteData, "content" | "color">>) => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: string) => void;
  boardRef: React.RefObject<HTMLDivElement>;
}

const NOTE_W = 180;
const NOTE_H = 180;

export const StickyNote = ({
  note,
  authorNickname,
  isOwner,
  isAuthed,
  onDragEnd,
  onUpdate,
  onDelete,
  onReport,
  boardRef,
}: Props) => {
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [reportReason, setReportReason] = useState("");
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!dragging) setPos({ x: note.x, y: note.y });
  }, [note.x, note.y, dragging]);

  useEffect(() => setDraft(note.content), [note.content]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isOwner || editing) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    dragRef.current = {
      dx: e.clientX - board.left - pos.x,
      dy: e.clientY - board.top - pos.y,
    };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragRef.current) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const nx = Math.max(0, Math.min(board.width - NOTE_W, e.clientX - board.left - dragRef.current.dx));
    const ny = Math.max(0, Math.min(board.height - NOTE_H, e.clientY - board.top - dragRef.current.dy));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    onDragEnd(note.id, pos.x, pos.y);
    dragRef.current = null;
  };

  const saveEdit = () => {
    const t = draft.trim();
    if (!t) return;
    if (t !== note.content) onUpdate(note.id, { content: t });
    setEditing(false);
  };

  const rot = rotationFor(note.id);

  return (
    <div
      className={cn(
        "sticky-note absolute select-none rounded-sm",
        colorClass(note.color),
        dragging && "dragging",
        isOwner ? "cursor-grab" : "cursor-default"
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: NOTE_W,
        height: NOTE_H,
        transform: dragging ? undefined : `rotate(${rot}deg)`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => isOwner && setEditing(true)}
    >
      {/* Pin */}
      <div className="pin absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full" data-no-drag />

      {editing ? (
        <div className="flex h-full flex-col p-3" data-no-drag>
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={140}
            className="flex-1 resize-none border-none bg-transparent p-0 font-note text-base shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs opacity-60">{draft.length}/140</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDraft(note.content); setEditing(false); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col p-3">
          <p className="flex-1 overflow-hidden whitespace-pre-wrap break-words font-note text-base leading-snug text-foreground">
            {note.content}
          </p>
          <div className="flex items-end justify-between pt-1">
            <span className="font-handwritten text-sm opacity-70">
              — {authorNickname ?? "anon"}
            </span>
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" data-no-drag>
              {isOwner ? (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Change color">
                        <Palette className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" data-no-drag>
                      <ColorPicker
                        value={note.color as NoteColor}
                        onChange={(c) => onUpdate(note.id, { color: c })}
                        size="sm"
                      />
                    </PopoverContent>
                  </Popover>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(note.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : isAuthed ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Report">
                      <Flag className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Report this note</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tell us briefly why. After 5 reports the author is banned.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      placeholder="Reason..."
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      maxLength={200}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setReportReason("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (reportReason.trim()) {
                            onReport(note.id, reportReason.trim());
                            setReportReason("");
                          }
                        }}
                      >
                        Report
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Always-visible action overlay on hover via group */}
      <style>{`
        .sticky-note:hover [data-no-drag] .group-hover\\:opacity-100 { opacity: 1; }
      `}</style>
    </div>
  );
};
