import type { SupabaseClient } from "@supabase/supabase-js";
import { telegramChatIdToDb } from "@/lib/telegram-chat-id";

export async function upsertUserActive(
  supabase: SupabaseClient,
  telegramChatId: number,
  isActive: boolean,
): Promise<void> {
  const id = telegramChatIdToDb(telegramChatId);
  const { data, error } = await supabase
    .from("users")
    .upsert(
      { telegram_chat_id: id, is_active: isActive },
      { onConflict: "telegram_chat_id" },
    )
    .select("telegram_chat_id");

  if (error) {
    console.error("[users] upsert failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  if (!data?.length) {
    console.warn("[users] upsert returned no rows (unexpected)");
  }
}

export async function setUserInactive(
  supabase: SupabaseClient,
  telegramChatId: number,
): Promise<void> {
  const id = telegramChatIdToDb(telegramChatId);
  const { error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("telegram_chat_id", id);
  if (error) throw error;
}
