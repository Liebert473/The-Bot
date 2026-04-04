const TELEGRAM_API = "https://api.telegram.org";

export type TelegramSendResult =
  | { ok: true; data: unknown }
  | { ok: false; errorCode?: number; description?: string };

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
): Promise<TelegramSendResult> {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    error_code?: number;
    description?: string;
  };

  if (data.ok) return { ok: true, data };
  return {
    ok: false,
    errorCode: data.error_code,
    description: data.description,
  };
}

export function isTelegramForbidden(result: TelegramSendResult): boolean {
  return !result.ok && result.errorCode === 403;
}

export type TelegramUpdate = {
  message?: {
    chat: { id: number; type: string };
    text?: string;
    from?: { id: number; is_bot?: boolean };
  };
};
