import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendTelegramMessage,
  isTelegramForbidden,
  type TelegramUpdate,
} from "@/lib/telegram";
import { parseTelegramCommand } from "@/lib/telegram-commands";
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
      console.warn(
        "[webhook] 401 webhook secret mismatch or missing header. " +
          "If TELEGRAM_WEBHOOK_SECRET is set in Vercel, call setWebhook with the same secret_token. " +
          `Header present: ${Boolean(header)}`,
      );
      return Response.json(
        { error: "webhook_secret_mismatch" },
        { status: 401 },
      );
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
  const cmd = parseTelegramCommand(text);

  if (!cmd) {
    return new Response("OK", { status: 200 });
  }

  const token = getToken();
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[webhook] Supabase env misconfiguration", e);
    return new Response("Server Misconfiguration", { status: 500 });
  }

  if (cmd === "start") {
    try {
      await upsertUserActive(supabase, chatId, true);
      console.info("[webhook] /start registered user", { chatId });
      const result = await sendTelegramMessage(
        token,
        chatId,
        "Synthesis online. Pattern interrupts are armed. Send /stop to disengage.",
      );
      if (isTelegramForbidden(result)) {
        await setUserInactive(supabase, chatId);
      }
    } catch (e) {
      console.error("[webhook] /start failed", e);
      return new Response("Internal Error", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  }

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
    console.error("[webhook] /stop failed", e);
    return new Response("Internal Error", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
