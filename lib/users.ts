import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertUserActive(
  supabase: SupabaseClient,
  telegramChatId: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    { telegram_chat_id: telegramChatId, is_active: isActive },
    { onConflict: "telegram_chat_id" },
  );
  if (error) throw error;
}

export async function setUserInactive(
  supabase: SupabaseClient,
  telegramChatId: number,
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("telegram_chat_id", telegramChatId);
  if (error) throw error;
}
