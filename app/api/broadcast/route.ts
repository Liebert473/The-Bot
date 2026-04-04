import { verifyCronSecret } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramChatIdToDb } from "@/lib/telegram-chat-id";
import { generatePatternInterrupt } from "@/lib/synthesis/generate-message";
import { sendTelegramMessage, isTelegramForbidden } from "@/lib/telegram";
import { setUserInactive } from "@/lib/users";
import { parseCategory, type MessageCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ATTEMPTS = 5;

async function hashExistsForUser(
  supabase: ReturnType<typeof createAdminClient>,
  telegramChatId: number,
  contentHash: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("messages")
    .select("id")
    .eq("telegram_chat_id", telegramChatIdToDb(telegramChatId))
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function deliverToUser(
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
  category: MessageCategory,
  telegramChatId: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    const retryHint =
      attempt > 0
        ? `New hook, new feeling, new ending — do not recycle the last script (attempt ${attempt + 1}). Same rules: simple words, personal "you," valid Telegram HTML with closed tags.`
        : undefined;

    const { text, contentHash } = await generatePatternInterrupt({
      category,
      telegramChatId,
      supabase,
      retryHint,
    });

    const exists = await hashExistsForUser(supabase, telegramChatId, contentHash);
    if (exists) {
      attempt += 1;
      continue;
    }

    const sent = await sendTelegramMessage(token, telegramChatId, text, {
      parseMode: "HTML",
    });
    if (isTelegramForbidden(sent)) {
      await setUserInactive(supabase, telegramChatId);
      return { ok: false, reason: "forbidden" };
    }
    if (!sent.ok) {
      return {
        ok: false,
        reason: sent.description ?? `telegram_error_${sent.errorCode ?? "unknown"}`,
      };
    }

    const { error: insertError } = await supabase.from("messages").insert({
      telegram_chat_id: telegramChatIdToDb(telegramChatId),
      category,
      message_text: text,
      content_hash: contentHash,
    });

    if (insertError?.code === "23505") {
      attempt += 1;
      continue;
    }
    if (insertError) throw insertError;

    return { ok: true };
  }

  return { ok: false, reason: "max_attempts_hash_collision" };
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const category = parseCategory(url.searchParams.get("category"));
  if (!category) {
    return Response.json(
      { error: "Invalid or missing category (Filter | Momentum | Perspective)" },
      { status: 400 },
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json({ error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const { data: users, error } = await supabase
    .from("users")
    .select("telegram_chat_id")
    .eq("is_active", true);

  if (error) {
    console.error("[broadcast] fetch users", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = users ?? [];
  let sent = 0;
  let failed = 0;
  let deactivated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const chatId = Number(row.telegram_chat_id);
    const result = await deliverToUser(supabase, token, category, chatId);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (result.reason === "forbidden") deactivated += 1;
      errors.push(`${chatId}: ${result.reason}`);
    }
  }

  const body = {
    category,
    users: rows.length,
    sent,
    failed,
    deactivated,
    errors: errors.slice(0, 20),
    hint:
      rows.length === 0
        ? "No active users. Telegram must POST /api/webhook on /start (use production URL + correct TELEGRAM_WEBHOOK_SECRET if set). Commands /start@YourBot are supported."
        : undefined,
  };

  if (rows.length === 0) {
    console.warn("[broadcast] zero active users — skipping Gemini/Telegram");
  }

  return Response.json(body);
}
