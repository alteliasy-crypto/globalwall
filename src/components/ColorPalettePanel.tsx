import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Palette, Check, Star } from "lucide-react";
import { NOTE_COLORS, NoteColor, colorStyle } from "@/lib/noteColors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
  favoriteColor?: NoteColor | null;
  onSetFavorite?: (c: NoteColor) => void | Promise<void>;
}

/** Full-page color palette: 264 colors grouped by family, with a Favorite Color slot. */
export const ColorPalettePanel = ({ value, onChange, favoriteColor, onSetFavorite }: Props) => {
  const [query, setQuery] = useState("");
  const families = useMemo(() => {
    const map = new Map<string, typeof NOTE_COLORS>();
    for (const c of NOTE_COLORS) {
      if (query && !c.label.toLowerCase().includes(query.toLowerCase()) && !c.family.toLowerCase().includes(query.toLowerCase())) continue;
      if (!map.has(c.family)) map.set(c.family, [] as any);
      (map.get(c.family) as any).push(c);
    }
    return Array.from(map.entries());
  }, [query]);

  const handleFav = async () => {
    if (!onSetFavorite) return;
    await onSetFavorite(value);
    toast.success("Favorite color saved ⭐");
  };

  const useFav = () => {
    if (favoriteColor) onChange(favoriteColor);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="All colors">
          <Palette className="h-4 w-4" />
          <span
            className="h-3 w-3 rounded-full border border-foreground/20"
            style={colorStyle(value)}
          />
          <span className="hidden font-handwritten text-base sm:inline">Colors</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[95vw] max-w-[1400px] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border/50 p-4">
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" /> Color Palette
            <span className="rounded-full bg-muted px-2 text-xs font-bold text-muted-foreground">{NOTE_COLORS.length}</span>
          </DialogTitle>
          <DialogDescription className="font-note text-base">
            Pick any color for your next note. Save a favorite for one-click access.
          </DialogDescription>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search colors (e.g. rose, mint, blue)…"
              className="flex-1 min-w-[200px]"
            />
            <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-3 py-1.5">
              <span className="text-xs font-bold text-muted-foreground">Favorite:</span>
              {favoriteColor ? (
                <button
                  type="button"
                  onClick={useFav}
                  title={`Use favorite: ${favoriteColor}`}
                  style={colorStyle(favoriteColor)}
                  className="h-6 w-6 rounded-full border border-foreground/20 hover:scale-110 transition"
                />
              ) : (
                <span className="text-xs text-muted-foreground">none yet</span>
              )}
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={handleFav} disabled={!onSetFavorite}>
                <Star className="h-3.5 w-3.5" />
                Set current as favorite
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {families.map(([family, colors]) => (
            <div key={family}>
              <h3 className="mb-2 font-handwritten text-xl font-bold text-foreground/80">{family}</h3>
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-[repeat(18,minmax(0,1fr))]">
                {colors.map((c) => {
                  const selected = value === c.id;
                  const isFav = favoriteColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onChange(c.id)}
                      title={c.label}
                      style={colorStyle(c.id)}
                      className={cn(
                        "relative aspect-square rounded-lg border border-foreground/10 transition-transform hover:scale-110",
                        selected && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                      )}
                    >
                      {selected && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-foreground/80 drop-shadow" />
                      )}
                      {isFav && !selected && (
                        <Star className="absolute right-0.5 top-0.5 h-3 w-3 fill-amber-400 text-amber-500 drop-shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {families.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No colors match "{query}"</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
