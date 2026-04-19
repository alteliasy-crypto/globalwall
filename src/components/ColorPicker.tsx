import { NOTE_COLORS, NoteColor } from "@/lib/noteColors";
import { cn } from "@/lib/utils";

interface Props {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
  size?: "sm" | "md";
}

export const ColorPicker = ({ value, onChange, size = "md" }: Props) => {
  const dim = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {NOTE_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.id)}
          className={cn(
            dim,
            c.bg,
            "rounded-full border border-foreground/10 transition-transform hover:scale-110",
            value === c.id && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
          )}
        />
      ))}
    </div>
  );
};
