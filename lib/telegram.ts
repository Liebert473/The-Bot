const TELEGRAM_API = "https://api.telegram.org";

export type TelegramSendResult =
  | { ok: true; data: unknown }
  | { ok: false; errorCode?: number; description?: string };

export type SendMessageOptions = {
  /** Telegram Bot API HTML mode (subset of tags). */
  parseMode?: "HTML";
};

/** Strip tags / entities for fallback when HTML is rejected. */
function htmlToPlainFallback(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function postSendMessage(
  token: string,
  body: Record<string, unknown>,
): Promise<{
  ok: boolean;
  error_code?: number;
  description?: string;
}> {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as {
    ok: boolean;
    error_code?: number;
    description?: string;
  };
}

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  options?: SendMessageOptions,
): Promise<TelegramSendResult> {
  if (options?.parseMode === "HTML") {
    const data = await postSendMessage(token, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    if (data.ok) return { ok: true, data };

    if (data.error_code === 400) {
      console.warn(
        "[telegram] HTML send failed, retrying plain",
        data.description,
      );
      const plain = htmlToPlainFallback(text);
      const fallback = await postSendMessage(token, {
        chat_id: chatId,
        text: plain || text,
        disable_web_page_preview: true,
      });
      if (fallback.ok) return { ok: true, data: fallback };
      return {
        ok: false,
        errorCode: fallback.error_code,
        description: fallback.description,
      };
    }

    return {
      ok: false,
      errorCode: data.error_code,
      description: data.description,
    };
  }

  const data = await postSendMessage(token, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });

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
