export type NoteColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple" | "mint" | "coral" | "peach" | "lilac" | "aqua" | "lime";

export const NOTE_COLORS: { id: NoteColor; label: string; bg: string; ring: string }[] = [
  { id: "yellow", label: "Sunshine", bg: "bg-note-yellow", ring: "ring-note-yellow" },
  { id: "pink",   label: "Bubblegum", bg: "bg-note-pink", ring: "ring-note-pink" },
  { id: "blue",   label: "Sky", bg: "bg-note-blue", ring: "ring-note-blue" },
  { id: "green",  label: "Meadow", bg: "bg-note-green", ring: "ring-note-green" },
  { id: "orange", label: "Tangerine", bg: "bg-note-orange", ring: "ring-note-orange" },
  { id: "purple", label: "Lavender", bg: "bg-note-purple", ring: "ring-note-purple" },
  { id: "mint",   label: "Mint", bg: "bg-note-mint", ring: "ring-note-mint" },
  { id: "coral",  label: "Coral", bg: "bg-note-coral", ring: "ring-note-coral" },
  { id: "peach",  label: "Peach", bg: "bg-note-peach", ring: "ring-note-peach" },
  { id: "lilac",  label: "Lilac", bg: "bg-note-lilac", ring: "ring-note-lilac" },
  { id: "aqua",   label: "Aqua", bg: "bg-note-aqua", ring: "ring-note-aqua" },
  { id: "lime",   label: "Lime Pop", bg: "bg-note-lime", ring: "ring-note-lime" },
];

export const colorClass = (c: string) => {
  const found = NOTE_COLORS.find((n) => n.id === c);
  return found ? found.bg : "bg-note-yellow";
};

// Deterministic small rotation per id for organic look
export const rotationFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const deg = ((h % 11) - 5) * 0.6; // -3deg .. +3deg
  return deg;
};
