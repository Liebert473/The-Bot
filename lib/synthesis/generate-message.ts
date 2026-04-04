import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { loadKnowledgeBase } from "@/lib/knowledge";
import type { MessageCategory } from "@/lib/types";
import { hashMessage } from "@/lib/hash-message";
import { telegramChatIdToDb } from "@/lib/telegram-chat-id";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL_ID = "gemini-2.5-flash";

const googleNoThinking = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
} as const;

const TONE: Record<MessageCategory, string> = {
  Filter:
    "Voice: protective, steady, a little cold — like someone who will not lie to you. Category: The Filter. You are helping them walk into noise without believing every voice. Speak to *them* (you/your). Simple words.",
  Momentum:
    "Voice: urgent, close, almost angry on their behalf — not abstract motivation. Category: The Momentum. You want them moving *today*. Short punches. You feel it with them. Simple words.",
  Perspective:
    "Voice: quiet, wide, honest — night-thoughts, not a lecture. Category: The Perspective. Make it personal: what this costs them in their chest, not in theory. Simple words, room to breathe.",
};

function buildSystemPrompt(manifesto: string, framework: string): string {
  return `You are "The Synthesis" — a digital conscience on Telegram. You talk to one real person. You are on their side against drift, excuses, and the "average" script.

IDEAS TO STEAL (themes only — do not copy phrasing; keep your own simple words):

--- FRAMEWORK ---
${framework}

--- MANIFESTO ---
${manifesto}

HOW YOU WRITE (this matters more than sounding smart):
- Use plain, everyday vocabulary. If a ten-year-old would not say it out loud, swap it for a simpler word.
- Be emotional and personal: name what they might feel (tired, scared, hungry to prove something, ashamed, wired). Talk to "you" — not "one should" or "humans tend to."
- Short sentences. Let some lines stand alone. One idea per breath.
- Still sharp: no empty cheer, no "you got this" fluff, no therapy-speak. You can be kind and still cut.
- Synthetic Psychology in *plain* terms: habits are patterns they can change; the mind is not magic — treat it like something workable.

TELEGRAM HTML (required — parse_mode HTML):
- Tags allowed only: <b> or <strong>, <i> or <em>, <u>, <s>, <code>, <pre>. Nest correctly; close every tag.
- Open with one bold line they feel in the gut: <b>…</b>
- Use <i>…</i> for a softer human beat (one short phrase), not irony piles.
- At most one <code>…</code> for a single plain label (e.g. drift, loop, cost) — not a whole sentence.
- Separate blocks with \\n\\n. No Markdown (* _). Escape &, <, > as &amp; &lt; &gt; outside tags.
- No fake links.

LENGTH & COMPLETION (critical):
- Aim about 350–750 characters of visible text (not counting tags). Enough to land one full emotional arc: hook → truth → what to do now.
- You MUST finish: complete sentences, closed tags, no mid-word cutoffs. If you run long, tighten wording — never trail off.
- Never repeat or recycle the same opening hook or metaphor as in recent sends below.`;

}

type HistoryRow = { message_text: string; category: string; sent_at: string };

export async function fetchMessageHistory(
  supabase: SupabaseClient,
  telegramChatId: number,
  limit = 20,
): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("message_text, category, sent_at")
    .eq("telegram_chat_id", telegramChatIdToDb(telegramChatId))
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as HistoryRow[];
}

function formatHistoryForPrompt(rows: HistoryRow[]): string {
  if (rows.length === 0) return "(no prior sends for this user)";
  return rows
    .map(
      (r, i) =>
        `[${i + 1}] ${r.category} @ ${r.sent_at}:\n${r.message_text.slice(0, 500)}${r.message_text.length > 500 ? "…" : ""}`,
    )
    .join("\n\n---\n\n");
}

export async function generatePatternInterrupt(params: {
  category: MessageCategory;
  telegramChatId: number;
  supabase: SupabaseClient;
  /** Extra instruction when retrying after hash collision. */
  retryHint?: string;
}): Promise<{ text: string; contentHash: string }> {
  const { category, telegramChatId, supabase, retryHint } = params;
  const { manifesto, framework } = await loadKnowledgeBase();
  const history = await fetchMessageHistory(supabase, telegramChatId);

  const system = buildSystemPrompt(manifesto, framework);
  const userPrompt = `${TONE[category]}

RECENT SENDS (stay fresh — new hook, new feeling, new ending):
${formatHistoryForPrompt(history)}
${retryHint ? `\n\nRETRY REQUIREMENT:\n${retryHint}` : ""}

Write the next single Telegram HTML message now.`;

  const primary = await generateText({
    model: google(MODEL_ID),
    system,
    prompt: userPrompt,
    maxOutputTokens: 4096,
    providerOptions: googleNoThinking,
  });

  let text = primary.text;
  if (primary.finishReason === "length") {
    console.warn("[synthesis] hit max output length; appending completion pass");
    const { text: tail } = await generateText({
      model: google(MODEL_ID),
      system:
        "You complete truncated Telegram HTML. Allowed tags: b, strong, i, em, u, s, code, pre. Close all tags. No repetition of earlier lines. Plain, emotional, simple words.",
      prompt: `This HTML message was cut off. Output ONLY the missing ending (a few short sentences) so the thought finishes and every tag is closed. Do not restart from the top.

Ends abruptly here:
${text.slice(-1500)}`,
      maxOutputTokens: 1024,
      providerOptions: googleNoThinking,
    });
    text = `${text.trim()}\n\n${tail.trim()}`;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Model returned empty text");
  }

  return { text: trimmed, contentHash: hashMessage(trimmed) };
}
