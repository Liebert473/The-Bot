const API = "https://api.telegram.org";

export async function telegramGetMe(token: string) {
  const res = await fetch(`${API}/bot${token}/getMe`);
  return res.json() as Promise<{
    ok: boolean;
    result?: { username?: string; id?: number };
    description?: string;
  }>;
}

export async function telegramGetWebhookInfo(token: string) {
  const res = await fetch(`${API}/bot${token}/getWebhookInfo`);
  return res.json() as Promise<{
    ok: boolean;
    result?: {
      url?: string;
      has_custom_certificate?: boolean;
      pending_update_count?: number;
      last_error_date?: number;
      last_error_message?: string;
      max_connections?: number;
      allowed_updates?: string[];
    };
  }>;
}
