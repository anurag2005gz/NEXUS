import { supabase } from "../config/supabase.js";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase configuration is missing. Check your .env.local file."
    );
  }
}

export async function getDiscussions() {
  requireSupabase();

  const { data, error } = await supabase
    .from("discussions")
    .select(`
      id,
      user_id,
      author_name,
      title,
      body,
      category,
      created_at,
      discussion_replies (
        id,
        user_id,
        author_name,
        body,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}


export async function createDiscussion({
  title,
  body,
  category,
  userId,
  authorName
}) {
  requireSupabase();

  const { data, error } = await supabase
    .from("discussions")
    .insert({
      title,
      body,
      category,
      user_id: userId,
      author_name: authorName || "Student"
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function createReply({
  discussionId,
  body,
  userId,
  authorName
}) {
  requireSupabase();

  const { data, error } = await supabase
    .from("discussion_replies")
    .insert({
      discussion_id: discussionId,
      body,
      user_id: userId,
      author_name: authorName || "Student"
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}