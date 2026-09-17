"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase";

export type Profile = { id: string; display_name: string; role: "buyer" | "seller" };
type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: (user?: User | null) => Promise<Profile | null>;
  signOut: () => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Incorrect email or password.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before logging in.";
  if (lower.includes("already registered")) return "An account already exists for this email. Please log in.";
  return "We couldn’t complete that request. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile(currentUser?: User | null) {
    const activeUser = currentUser === undefined ? (await getBrowserSupabase().auth.getUser()).data.user : currentUser;
    if (!activeUser) {
      setProfile(null);
      return null;
    }
    const { data } = await getBrowserSupabase().from("profiles").select("id, display_name, role").eq("id", activeUser.id).maybeSingle();
    const nextProfile = data as Profile | null;
    setProfile(nextProfile);
    return nextProfile;
  }

  useEffect(() => {
    let mounted = true;
    const supabase = getBrowserSupabase();
    async function restore() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(session?.user ?? null);
      await refreshProfile(session?.user ?? null);
      if (mounted) setLoading(false);
    }
    void restore();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void refreshProfile(session?.user ?? null);
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    const { error } = await getBrowserSupabase().auth.signOut();
    if (error) return { error: friendlyAuthError(error.message) };
    setUser(null);
    setProfile(null);
    return {};
  }

  const value = useMemo(() => ({ user, profile, loading, refreshProfile, signOut }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export { friendlyAuthError };
