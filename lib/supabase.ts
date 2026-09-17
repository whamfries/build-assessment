import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  return url;
}

function getSupabasePublishableKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");
  return key;
}

function getSupabaseSecretKey() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is required");
  return key;
}

export const getBrowserSupabase = () => createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
export const getServerSupabase = () => createClient(getSupabaseUrl(), getSupabasePublishableKey(), { auth: { persistSession: false } });
export const getAdminSupabase = () => createClient(getSupabaseUrl(), getSupabaseSecretKey(), { auth: { persistSession: false } });
