import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Palette, Check } from "lucide-react";
import { NOTE_COLORS, NoteColor, colorStyle } from "@/lib/noteColors";
import { cn } from "@/lib/utils";

interface Props {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
}

/** Full-page color palette: 250+ colors grouped by family. */
export const ColorPalettePanel = ({ value, onChange }: Props) => {
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="All colors">
          <Palette className="h-4 w-4" />
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
            Pick any color for your next note. The selected color is highlighted.
          </DialogDescription>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search colors (e.g. rose, mint, blue)…"
            className="mt-2"
          />
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {families.map(([family, colors]) => (
            <div key={family}>
              <h3 className="mb-2 font-handwritten text-xl font-bold text-foreground/80">{family}</h3>
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-[repeat(18,minmax(0,1fr))]">
                {colors.map((c) => {
                  const selected = value === c.id;
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
