const TELEGRAM_API = "https://api.telegram.org";

/** Hard limit per Bot API message (UTF-16 code units). */
const TELEGRAM_HARD_LIMIT = 4096;
/** Stay under limit so HTML entities / edge cases do not overflow. */
const CHUNK_SAFE = 3800;

export type TelegramSendResult =
  | { ok: true; data: unknown }
  | { ok: false; errorCode?: number; description?: string };

export type SendMessageOptions = {
  /** Telegram Bot API HTML mode (subset of tags). */
  parseMode?: "HTML";
};

/** Split long text into chunks Telegram will accept (paragraph / line / word aware). */
export function chunkForTelegram(text: string): string[] {
  const t = text.trim();
  if (t.length <= TELEGRAM_HARD_LIMIT) return [t];

  const chunks: string[] = [];
  let start = 0;
  while (start < t.length) {
    if (start + TELEGRAM_HARD_LIMIT >= t.length) {
      chunks.push(t.slice(start).trim());
      break;
    }
    const windowEnd = start + CHUNK_SAFE;
    const window = t.slice(start, windowEnd);
    let rel = window.lastIndexOf("\n\n");
    if (rel < CHUNK_SAFE / 3) rel = window.lastIndexOf("\n");
    if (rel < CHUNK_SAFE / 3) rel = window.lastIndexOf(" ");
    const take = rel > 0 ? rel : CHUNK_SAFE;
    const piece = t.slice(start, start + take).trim();
    if (piece) chunks.push(piece);
    start += take;
    while (start < t.length && /\s/.test(t[start]!)) start++;
  }
  return chunks.filter((c) => c.length > 0);
}

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

async function sendOne(
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

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  options?: SendMessageOptions,
): Promise<TelegramSendResult> {
  const chunks = chunkForTelegram(text);
  let last: TelegramSendResult = { ok: true, data: null };

  for (const chunk of chunks) {
    last = await sendOne(token, chatId, chunk, options);
    if (!last.ok) return last;
  }

  return last;
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
