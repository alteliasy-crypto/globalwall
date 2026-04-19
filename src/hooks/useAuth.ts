import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  nickname: string;
  is_banned: boolean;
  warnings: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session) {
        // Defer anon sign-in until captcha is solved
        setNeedsCaptcha(true);
        setLoading(false);
      } else {
        setUser(session.user);
        await loadProfile(session.user.id);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from("users")
      .select("id, nickname, is_banned, warnings")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data as Profile | null);
  }

  async function signInWithCaptcha(captchaToken: string) {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { captchaToken },
    });
    if (error) return { error };
    setUser(data.user);
    setNeedsCaptcha(false);
    if (data.user) await loadProfile(data.user.id);
    return { error: null };
  }

  async function setNickname(nickname: string) {
    if (!user) return { error: new Error("Not signed in") };
    const trimmed = nickname.trim();
    if (!trimmed) return { error: new Error("Nickname required") };

    if (profile) {
      const { error } = await supabase
        .from("users")
        .update({ nickname: trimmed })
        .eq("id", user.id);
      if (error) return { error };
    } else {
      const { error } = await supabase
        .from("users")
        .insert({ id: user.id, nickname: trimmed });
      if (error) return { error };
    }
    await loadProfile(user.id);
    return { error: null };
  }

  return {
    user,
    profile,
    loading,
    needsCaptcha,
    signInWithCaptcha,
    setNickname,
    refreshProfile: () => user && loadProfile(user.id),
  };
}
