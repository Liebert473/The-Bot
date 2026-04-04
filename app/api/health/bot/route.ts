import { verifyCronSecret } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramGetMe, telegramGetWebhookInfo } from "@/lib/telegram-ops";

export const dynamic = "force-dynamic";

/**
 * Debug why /start does not create rows: Telegram webhook URL, last_error, Supabase counts.
 * Secured with the same CRON_SECRET as /api/broadcast (Bearer token).
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecretConfigured = Boolean(
    process.env.TELEGRAM_WEBHOOK_SECRET?.length,
  );

  let supabaseUsers: { ok: boolean; total?: number; active?: number; error?: string } =
    { ok: false };
  try {
    const supabase = createAdminClient();
    const { count: total, error: e1 } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    const { count: active, error: e2 } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const err = e1 ?? e2;
    if (err) {
      supabaseUsers = { ok: false, error: err.message };
    } else {
      supabaseUsers = { ok: true, total: total ?? 0, active: active ?? 0 };
    }
  } catch (e) {
    supabaseUsers = {
      ok: false,
      error: e instanceof Error ? e.message : "Supabase init/query failed",
    };
  }

  if (!token) {
    return Response.json({
      supabase: supabaseUsers,
      telegram: { ok: false, error: "TELEGRAM_BOT_TOKEN missing" },
      hints: [
        "Set TELEGRAM_BOT_TOKEN on Vercel.",
        webhookSecretConfigured
          ? "TELEGRAM_WEBHOOK_SECRET is set: register webhook with the same secret_token via setWebhook, or Telegram gets 401 and no DB writes occur."
          : "TELEGRAM_WEBHOOK_SECRET unset: webhook accepts any caller (less secure).",
      ],
    });
  }

  const [me, hook] = await Promise.all([
    telegramGetMe(token),
    telegramGetWebhookInfo(token),
  ]);

  const hints: string[] = [];
  if (webhookSecretConfigured) {
    hints.push(
      "TELEGRAM_WEBHOOK_SECRET is set. Your setWebhook call must include secret_token with the exact same value, or every update returns 401.",
    );
  }
  if (hook.ok && hook.result) {
    if (!hook.result.url) {
      hints.push("Telegram has no webhook URL set — /start never hits your server.");
    }
    if (hook.result.last_error_message) {
      hints.push(
        `Telegram last webhook error: ${hook.result.last_error_message}`,
      );
    }
    if ((hook.result.pending_update_count ?? 0) > 0) {
      hints.push(
        `pending_update_count=${hook.result.pending_update_count} — Telegram is queueing updates; fix webhook delivery (URL, HTTPS, errors).`,
      );
    }
  }

  return Response.json({
    supabase: supabaseUsers,
    telegram: {
      getMe: me.ok ? { ok: true, username: me.result?.username } : me,
      webhook: hook.result ?? hook,
    },
    env: {
      webhookSecretConfigured,
      supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    hints,
  });
}
