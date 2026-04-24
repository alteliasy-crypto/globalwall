// Massive note color palette — hundreds of hues across 12 families.
// Each family has 20 shades varying lightness/saturation.

export interface NoteColorDef {
  id: string;        // e.g. "rose-7"
  family: string;    // e.g. "Rose"
  label: string;     // display label
  hsl: string;       // "340 90% 82%"
}

const FAMILIES: { key: string; label: string; hue: number }[] = [
  { key: "rose",    label: "Rose",    hue: 350 },
  { key: "pink",    label: "Pink",    hue: 330 },
  { key: "fuchsia", label: "Fuchsia", hue: 300 },
  { key: "purple",  label: "Purple",  hue: 270 },
  { key: "indigo",  label: "Indigo",  hue: 240 },
  { key: "blue",    label: "Blue",    hue: 210 },
  { key: "sky",     label: "Sky",     hue: 195 },
  { key: "cyan",    label: "Cyan",    hue: 180 },
  { key: "teal",    label: "Teal",    hue: 165 },
  { key: "emerald", label: "Emerald", hue: 150 },
  { key: "green",   label: "Green",   hue: 130 },
  { key: "lime",    label: "Lime",    hue: 90 },
  { key: "yellow",  label: "Yellow",  hue: 52 },
  { key: "amber",   label: "Amber",   hue: 38 },
  { key: "orange",  label: "Orange",  hue: 24 },
  { key: "coral",   label: "Coral",   hue: 10 },
  { key: "brown",   label: "Brown",   hue: 25 },
  { key: "stone",   label: "Stone",   hue: 30 },
];

// Build palette: 18 families × 14 shades = 252 colors
export const ALL_NOTE_COLORS: NoteColorDef[] = (() => {
  const out: NoteColorDef[] = [];
  for (const fam of FAMILIES) {
    for (let i = 0; i < 14; i++) {
      // shades from light pastel to deeper saturated
      const lightness = 90 - i * 4;            // 90 → 38
      const saturation = fam.key === "stone" || fam.key === "brown"
        ? 20 + i * 2
        : 75 - (i > 7 ? (i - 7) * 4 : 0);      // peak sat at mid-range
      const hueShift = ((i % 3) - 1) * 4;
      const hue = (fam.hue + hueShift + 360) % 360;
      out.push({
        id: `${fam.key}-${i + 1}`,
        family: fam.label,
        label: `${fam.label} ${i + 1}`,
        hsl: `${hue} ${saturation}% ${lightness}%`,
      });
    }
  }
  return out;
})();

// Legacy 12 quick-pick colors (kept for backward compat with existing notes)
export const LEGACY_COLORS: NoteColorDef[] = [
  { id: "yellow", family: "Yellow", label: "Sunshine",  hsl: "52 95% 75%" },
  { id: "pink",   family: "Pink",   label: "Bubblegum", hsl: "340 90% 82%" },
  { id: "blue",   family: "Blue",   label: "Sky",       hsl: "200 85% 78%" },
  { id: "green",  family: "Green",  label: "Meadow",    hsl: "130 60% 75%" },
  { id: "orange", family: "Orange", label: "Tangerine", hsl: "28 95% 72%" },
  { id: "purple", family: "Purple", label: "Lavender",  hsl: "270 70% 80%" },
  { id: "mint",   family: "Mint",   label: "Mint",      hsl: "160 65% 78%" },
  { id: "coral",  family: "Coral",  label: "Coral",     hsl: "10 90% 78%" },
  { id: "peach",  family: "Peach",  label: "Peach",     hsl: "24 100% 83%" },
  { id: "lilac",  family: "Lilac",  label: "Lilac",     hsl: "284 75% 86%" },
  { id: "aqua",   family: "Aqua",   label: "Aqua",      hsl: "188 82% 80%" },
  { id: "lime",   family: "Lime",   label: "Lime Pop",  hsl: "86 78% 76%" },
];

const COLOR_MAP: Record<string, NoteColorDef> = (() => {
  const m: Record<string, NoteColorDef> = {};
  for (const c of LEGACY_COLORS) m[c.id] = c;
  for (const c of ALL_NOTE_COLORS) m[c.id] = c;
  return m;
})();

// Combined palette for the picker (legacy first, then all)
export const NOTE_COLORS = [...LEGACY_COLORS, ...ALL_NOTE_COLORS];

export type NoteColor = string;

export const colorHsl = (id: string): string => {
  return (COLOR_MAP[id] ?? LEGACY_COLORS[0]).hsl;
};

// Returns inline style background for a color id
export const colorStyle = (id: string): React.CSSProperties => ({
  backgroundColor: `hsl(${colorHsl(id)})`,
});

// Backwards-compat: some files import colorClass — return empty so inline style wins.
export const colorClass = (_id: string): string => "";

// Deterministic small rotation per id for organic look
export const rotationFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const deg = ((h % 11) - 5) * 0.6; // -3deg .. +3deg
  return deg;
};
