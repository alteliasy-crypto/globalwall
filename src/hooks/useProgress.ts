// Compatibility shim — the daily-task system was replaced by Quest Ladder in v5.0.
// This file re-exports from useQuests so older imports keep working.
export { notifyQuestRefresh as notifyDailyTaskRefresh, useQuests, useProgress } from "./useQuests";

// Mirror of public.calc_level — kept for components that compute level locally (LevelBar/Profile).
export function calcLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(xp, 0) / 50)) + 1);
}

export function xpForLevel(level: number): number {
  return Math.pow(Math.max(level - 1, 0), 2) * 50;
}

export function levelProgress(xp: number) {
  const level = calcLevel(xp);
  const curBase = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  const into = xp - curBase;
  const span = Math.max(1, nextBase - curBase);
  return { level, into, span, pct: Math.min(100, Math.round((into / span) * 100)), nextAt: nextBase };
}
