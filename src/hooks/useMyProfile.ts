import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MyProfileExtras {
  bio: string;
  avatar_key: string;
}

export function useMyProfile(userId: string | null) {
  const [extras, setExtras] = useState<MyProfileExtras>({ bio: "", avatar_key: "sparkle" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setExtras({ bio: "", avatar_key: "sparkle" });
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_profiles")
      .select("bio, avatar_key")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setExtras({ bio: data.bio ?? "", avatar_key: data.avatar_key ?? "sparkle" });
    } else {
      setExtras({ bio: "", avatar_key: "sparkle" });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<MyProfileExtras>) => {
    if (!userId) return { error: new Error("Not signed in") };
    const next = { ...extras, ...patch };
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    if (!error) setExtras(next);
    return { error };
  };

  return { ...extras, loading, save, refresh: load };
}
