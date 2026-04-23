import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Quest {
  id: string;
  slot: number;
  quest_key: string;
  title: string;
  description: string;
  fire_level: number;
  target: number;
  progress: number;
  coin_reward: number;
  token_reward: number;
}

export interface Wallet {
  coins: number;
  tokens: number;
  heat_streak: number;
  best_streak: number;
  highest_fire_cleared: number;
  total_quests_done: number;
  current_multiplier: number;
  active_boost_key: string | null;
  active_boost_expires_at: string | null;
}

const REFRESH_EVENTS = [
  "quest:refresh",
  "daily-task:refresh",
  "daily-task:note-created",
  "daily-task:note-reacted",
  "daily-task:note-upvoted",
  "daily-task:note-favorited",
  "daily-task:user-followed",
  "daily-task:bio-updated",
  "daily-task:avatar-updated",
] as const;

export function notifyQuestRefresh(name: (typeof REFRESH_EVENTS)[number] = "quest:refresh") {
  window.dispatchEvent(new CustomEvent(name));
}

// Back-compat alias for older imports
export const notifyDailyTaskRefresh = notifyQuestRefresh;

export function useQuests(userId: string | null) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setQuests([]);
      setWallet(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [{ data: q, error: qe }, { data: w, error: we }] = await Promise.all([
        (supabase as any).rpc("get_or_seed_quest_ladder"),
        (supabase as any).rpc("get_my_wallet"),
      ]);
      if (qe) throw qe;
      if (we) throw we;
      setQuests(((q ?? []) as Quest[]).sort((a, b) => a.slot - b.slot));
      setWallet(((w ?? []) as Wallet[])[0] ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load quests");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const handler = () => void refresh();
    REFRESH_EVENTS.forEach((e) => window.addEventListener(e, handler));
    return () => { REFRESH_EVENTS.forEach((e) => window.removeEventListener(e, handler)); };
  }, [refresh, userId]);

  const completeQuest = useCallback(async (questId: string) => {
    const { data, error } = await (supabase as any).rpc("complete_quest", { _quest_id: questId });
    if (error) return { ok: false, error };
    const row = ((data ?? []) as any[])[0];
    await refresh();
    return { ok: true, ...row };
  }, [refresh]);

  return { quests, wallet, loading, error, refresh, completeQuest };
}

// Back-compat shim so existing components using useProgress keep working.
// Maps wallet -> a minimal "progress-like" object.
export function useProgress(userId: string | null) {
  const { wallet, loading, error, refresh } = useQuests(userId);
  return {
    progress: wallet
      ? {
          xp: wallet.coins,
          level: 1 + Math.floor(wallet.total_quests_done / 5),
          streak_days: wallet.heat_streak,
          last_login_date: null,
          bonus_note_slots: Math.floor(wallet.total_quests_done / 2),
          tasks_completed: wallet.total_quests_done,
          current_boost_pct: Math.round((wallet.current_multiplier - 1) * 100),
          tomorrow_boost_pct: 0,
          tasks_done_today: wallet.heat_streak,
        }
      : null,
    task: null,
    loading,
    error,
    refresh,
    completeTask: async () => ({ error: new Error("Use Quest Ladder instead") as any, awarded: false }),
  };
}
