
  import { supabase } from "../config/supabase.js";


  function requireSupabase() {
    if (!supabase) {
      throw new Error(
        "Supabase configuration is missing. Check your .env.local file."
      );
    }
    
  }
  export async function uploadNoticePoster(file) {
    requireSupabase();

    if (!file) {
      throw new Error("Please select a poster image.");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only JPG, PNG and WebP images are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Poster must be smaller than 5 MB.");
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabase.storage
      .from("notice-posters")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("notice-posters")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  const NOTICE_FIELDS =
    "id,title,category,description,event_date,deadline,venue,registration_url,source_name,poster_url";

  export async function getNotices() {
    requireSupabase();

    const { data, error } = await supabase
      .from("notices")
      .select(NOTICE_FIELDS)
      .order("event_date", {
        ascending: true,
        nullsFirst: false
      });

    if (error) throw error;

    return data || [];
  }

  export async function addNotice(notice) {
    requireSupabase();

    const { data, error } = await supabase
      .from("notices")
      .insert(notice)
      .select(NOTICE_FIELDS)
      .single();

    if (error) throw error;

    return data;
  }

  export async function updateNotice(id, notice) {
    requireSupabase();

    const { data, error } = await supabase
      .from("notices")
      .update(notice)
      .eq("id", id)
      .select(NOTICE_FIELDS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Notice not found or update was not permitted.");
    }

    return data;
  }

  export async function deleteNotice(id) {
    requireSupabase();

    const { data, error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Notice not found or deletion was not permitted.");
    }

    return data;
  }
