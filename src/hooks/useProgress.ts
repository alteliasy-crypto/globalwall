import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MyProgress {
  xp: number;
  level: number;
  streak_days: number;
  last_login_date: string | null;
  bonus_note_slots: number;
  tasks_completed: number;
}

export interface DailyTask {
  id: string;
  task_date: string;
  task_key: string;
  task_title: string;
  task_description: string;
  target: number;
  progress: number;
  xp_reward: number;
  completed_at: string | null;
}

const TASK_REFRESH_EVENTS = [
  "daily-task:refresh",
  "daily-task:note-created",
  "daily-task:note-reacted",
  "daily-task:note-upvoted",
  "daily-task:note-favorited",
  "daily-task:user-followed",
  "daily-task:bio-updated",
  "daily-task:avatar-updated",
] as const;

export function notifyDailyTaskRefresh(eventName: (typeof TASK_REFRESH_EVENTS)[number] = "daily-task:refresh") {
  window.dispatchEvent(new CustomEvent(eventName));
}

// Mirror of public.calc_level — keep in sync with the SQL function.
export function calcLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(xp, 0) / 50)) + 1);
}

export function xpForLevel(level: number): number {
  // inverse of calc_level: xp needed to reach `level`
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

export function useProgress(userId: string | null) {
  const [progress, setProgress] = useState<MyProgress | null>(null);
  const [task, setTask] = useState<DailyTask | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProgress(null);
      setTask(null);
      setLoading(false);
      return;
    }
    const [{ data: prog }, { data: t }] = await Promise.all([
      (supabase as any).rpc("get_my_progress"),
      (supabase as any).rpc("get_or_assign_daily_task"),
    ]);
    setProgress(((prog ?? []) as MyProgress[])[0] ?? null);
    setTask(((t ?? []) as DailyTask[])[0] ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const handleRefresh = () => {
      void refresh();
    };

    TASK_REFRESH_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleRefresh);
    });

    return () => {
      TASK_REFRESH_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleRefresh);
      });
    };
  }, [refresh, userId]);

  const completeTask = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("complete_daily_task");
    if (error) return { error, awarded: false };
    const row = ((data ?? []) as { xp: number; level: number; bonus_note_slots: number; awarded: boolean }[])[0];
    await refresh();
    return { error: null, awarded: !!row?.awarded, xp: row?.xp, level: row?.level };
  }, [refresh]);

  return { progress, task, loading, refresh, completeTask };
}
