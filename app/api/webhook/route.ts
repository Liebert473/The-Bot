import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendTelegramMessage,
  isTelegramForbidden,
  type TelegramUpdate,
} from "@/lib/telegram";
import { upsertUserActive, setUserInactive } from "@/lib/users";

export const dynamic = "force-dynamic";

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  return token;
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text || !msg.chat?.id) {
    return new Response("OK", { status: 200 });
  }

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const token = getToken();
  const supabase = createAdminClient();

  const lower = text.toLowerCase();
  if (lower === "/start") {
    try {
      await upsertUserActive(supabase, chatId, true);
      const result = await sendTelegramMessage(
        token,
        chatId,
        "Synthesis online. Pattern interrupts are armed. Send /stop to disengage.",
      );
      if (isTelegramForbidden(result)) {
        await setUserInactive(supabase, chatId);
      }
    } catch (e) {
      console.error("[webhook] /start", e);
    }
    return new Response("OK", { status: 200 });
  }

  if (lower === "/stop") {
    try {
      await setUserInactive(supabase, chatId);
      const result = await sendTelegramMessage(
        token,
        chatId,
        "Acknowledged. Broadcasts paused. /start when you want the signal again.",
      );
      if (isTelegramForbidden(result)) {
        await setUserInactive(supabase, chatId);
      }
    } catch (e) {
      console.error("[webhook] /stop", e);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("OK", { status: 200 });
}
