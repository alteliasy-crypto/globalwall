import { Button } from "@/components/ui/button";
import { NoteColor } from "@/lib/noteColors";
import { Plus, LogOut, Sparkles, HelpCircle, FileText, Trash2, User as UserIcon, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_VERSION, DEV_NOTES } from "@/lib/version";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Avatar } from "./Avatar";

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
  favoritesSlot?: React.ReactNode;
  dailySlot?: React.ReactNode;
  marketSlot?: React.ReactNode;
  leaderboardSlot?: React.ReactNode;
  colorsSlot?: React.ReactNode;
  deviceMode?: "auto" | "phone" | "tablet" | "desktop";
  onDeviceModeChange?: (mode: "auto" | "phone" | "tablet" | "desktop") => void;
}

export const Toolbar = ({
  userId, nickname, avatarKey, myCount, noteCap, totalCount, newColor, setNewColor, onAddNote, onSignOut, onEditProfile, onDeleteAllMine, canAdd, inboxSlot, favoritesSlot, dailySlot, marketSlot, leaderboardSlot, colorsSlot, deviceMode = "auto", onDeviceModeChange,
}: Props) => {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
      <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/80 px-4 py-2.5 shadow-lg backdrop-blur-md">
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
          {colorsSlot}
          {leaderboardSlot}
          {marketSlot}
          {favoritesSlot}
          {dailySlot}
          {inboxSlot}

          <Button onClick={onAddNote} disabled={!canAdd} className="gap-1.5 rounded-full" title={`${myCount}/${noteCap} notes this hour`}>
            <Plus className="h-4 w-4" />
            <span className="font-handwritten text-base">Add note</span>
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">{myCount}/{noteCap}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full pl-1 pr-3">
                <Avatar avatarKey={avatarKey} size="sm" />
                <span className="font-handwritten text-base">{nickname ?? "..."}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-handwritten text-3xl">Settings</DialogTitle>
                    <DialogDescription className="font-note text-base">
                      Choose the preview frame for this device.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground">Device chooser</label>
                    <Select value={deviceMode} onValueChange={(v) => onDeviceModeChange?.(v as "auto" | "phone" | "tablet" | "desktop")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto / full screen</SelectItem>
                        <SelectItem value="phone">Phone frame</SelectItem>
                        <SelectItem value="tablet">Tablet frame</SelectItem>
                        <SelectItem value="desktop">Desktop frame</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        <li>📌 Drop up to <b>15 sticky notes per hour</b> on the global cork board (more as you complete quests).</li>
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
