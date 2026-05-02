import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyDailyTaskRefresh } from "./useProgress";

export interface MyProfileExtras {
  bio: string;
  avatar_key: string;
  favorite_color: string | null;
}

export function useMyProfile(userId: string | null) {
  const [extras, setExtras] = useState<MyProfileExtras>({ bio: "", avatar_key: "sparkle", favorite_color: null });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setExtras({ bio: "", avatar_key: "sparkle", favorite_color: null });
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_profiles")
      .select("bio, avatar_key, favorite_color")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setExtras({
        bio: (data as any).bio ?? "",
        avatar_key: (data as any).avatar_key ?? "sparkle",
        favorite_color: (data as any).favorite_color ?? null,
      });
    } else {
      setExtras({ bio: "", avatar_key: "sparkle", favorite_color: null });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<MyProfileExtras>) => {
    if (!userId) return { error: new Error("Not signed in") };
    const next = { ...extras, ...patch };
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, ...next } as any, { onConflict: "user_id" });
    if (!error) {
      setExtras(next);
      if (typeof patch.bio === "string") notifyDailyTaskRefresh("daily-task:bio-updated");
      if (typeof patch.avatar_key === "string") notifyDailyTaskRefresh("daily-task:avatar-updated");
    }
    return { error };
  };

  return { ...extras, loading, save, refresh: load };
}
