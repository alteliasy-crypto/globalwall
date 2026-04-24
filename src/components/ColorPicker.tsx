import { LEGACY_COLORS, NoteColor, colorStyle } from "@/lib/noteColors";
import { cn } from "@/lib/utils";

interface Props {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
  size?: "sm" | "md";
}

/** Compact picker — 12 legacy quick colors. For full palette use ColorPalettePanel. */
export const ColorPicker = ({ value, onChange, size = "md" }: Props) => {
  const dim = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {LEGACY_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.id)}
          style={colorStyle(c.id)}
          className={cn(
            dim,
            "rounded-full border border-foreground/10 transition-transform hover:scale-110",
            value === c.id && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
          )}
        />
      ))}
    </div>
  );
};
