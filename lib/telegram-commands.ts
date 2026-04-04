/**
 * Telegram sends /start@BotUsername in groups and often in DMs when tapping deep links.
 * Plain equality with "/start" misses those updates.
 */
export function parseTelegramCommand(text: string): "start" | "stop" | null {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first === "/start" || first.startsWith("/start@")) return "start";
  if (first === "/stop" || first.startsWith("/stop@")) return "stop";
  return null;
}
