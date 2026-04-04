/**
 * PostgREST / Supabase: BIGINT columns are safest as strings in filters and writes.
 */
export function telegramChatIdToDb(chatId: number): string {
  if (!Number.isFinite(chatId)) {
    throw new Error(`Invalid telegram chat id: ${chatId}`);
  }
  return String(Math.trunc(chatId));
}
