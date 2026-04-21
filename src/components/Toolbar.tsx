import { Button } from "@/components/ui/button";
import { ColorPicker } from "./ColorPicker";
import { NoteColor } from "@/lib/noteColors";
import { Plus, LogOut, Sparkles, HelpCircle, FileText, Trash2, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_VERSION, DEV_NOTES } from "@/lib/version";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  nickname: string | null;
  myCount: number;
  totalCount: number;
  newColor: NoteColor;
  setNewColor: (c: NoteColor) => void;
  onAddNote: () => void;
  onSignOut: () => void;
  onDeleteAllMine: () => void;
  canAdd: boolean;
  inboxSlot?: React.ReactNode;
  favoritesSlot?: React.ReactNode;
}

export const Toolbar = ({
  nickname, myCount, totalCount, newColor, setNewColor, onAddNote, onSignOut, onDeleteAllMine, canAdd, inboxSlot, favoritesSlot,
}: Props) => {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/80 px-4 py-2.5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-handwritten text-2xl font-bold leading-none">Global Wall</h1>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {APP_VERSION}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {totalCount} note{totalCount === 1 ? "" : "s"} live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/50 bg-card/60 px-2.5 py-1 md:flex">
            <span className="text-xs text-muted-foreground">Color:</span>
            <ColorPicker value={newColor} onChange={setNewColor} size="sm" />
          </div>

          {favoritesSlot}
          {inboxSlot}

          <Button onClick={onAddNote} disabled={!canAdd} className="gap-1.5 rounded-full">
            <Plus className="h-4 w-4" />
            <span className="font-handwritten text-base">Add note</span>
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">{myCount}/3</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                <span className="font-handwritten text-base">{nickname ?? "..."}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-handwritten text-base">
                Hi, {nickname ?? "friend"}!
              </DropdownMenuLabel>
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
                        <li>📌 Drop up to <b>3 sticky notes</b> on the global cork board.</li>
                        <li>🎨 Pick a color and write up to 140 characters.</li>
                        <li>✋ <b>Drag</b> your own notes anywhere. <b>Double-click</b> to edit.</li>
                        <li>🌍 Everything is <b>live</b> — refresh-free, see updates instantly.</li>
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
