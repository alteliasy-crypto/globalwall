// Preset avatars — emoji on a colored background.
// Stable, no uploads, moderation-friendly.
export interface AvatarPreset {
  key: string;
  emoji: string;
  bg: string; // tailwind bg class
  ring: string; // tailwind ring/border accent
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: "sparkle", emoji: "✨", bg: "bg-amber-200", ring: "ring-amber-400" },
  { key: "rocket", emoji: "🚀", bg: "bg-sky-200", ring: "ring-sky-400" },
  { key: "cat", emoji: "🐱", bg: "bg-orange-200", ring: "ring-orange-400" },
  { key: "fox", emoji: "🦊", bg: "bg-rose-200", ring: "ring-rose-400" },
  { key: "panda", emoji: "🐼", bg: "bg-zinc-200", ring: "ring-zinc-400" },
  { key: "frog", emoji: "🐸", bg: "bg-lime-200", ring: "ring-lime-500" },
  { key: "octopus", emoji: "🐙", bg: "bg-pink-200", ring: "ring-pink-400" },
  { key: "owl", emoji: "🦉", bg: "bg-amber-100", ring: "ring-amber-500" },
  { key: "ghost", emoji: "👻", bg: "bg-violet-200", ring: "ring-violet-400" },
  { key: "robot", emoji: "🤖", bg: "bg-slate-200", ring: "ring-slate-400" },
  { key: "alien", emoji: "👽", bg: "bg-emerald-200", ring: "ring-emerald-400" },
  { key: "dragon", emoji: "🐲", bg: "bg-teal-200", ring: "ring-teal-400" },
];

export const AVATAR_BY_KEY: Record<string, AvatarPreset> = Object.fromEntries(
  AVATAR_PRESETS.map((a) => [a.key, a])
);

export function getAvatar(key: string | null | undefined): AvatarPreset {
  if (!key) return AVATAR_PRESETS[0];
  return AVATAR_BY_KEY[key] ?? AVATAR_PRESETS[0];
}
