import { supabase } from "../config/supabase.js";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase configuration is missing. Check your .env.local file.");
  }
}

export async function signIn(email, password) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function verifyAdmin(user) {
  requireSupabase();
  if (!user?.id) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export function subscribeToAuthChanges(callback) {
  requireSupabase();
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function restoreSession() {
  requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
