import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { loadKnowledgeBase } from "@/lib/knowledge";
import type { MessageCategory } from "@/lib/types";
import { hashMessage } from "@/lib/hash-message";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL_ID = "gemini-2.5-flash";

const TONE: Record<MessageCategory, string> = {
  Filter:
    "Tone: cold, clinical, and defensive. Category: The Filter — neutralize social gravity and the 'average' script. Prepare the user to ignore the noise of the day.",
  Momentum:
    "Tone: tactical and aggressive. Category: The Momentum — high-intensity execution and cognitive refactoring. Force a pattern interrupt; demand immediate alignment with output.",
  Perspective:
    "Tone: philosophical and expansive. Category: The Perspective — scale, meaning, and the greater game. Zoom out; stillness of a predator; peace in the pursuit.",
};

function buildSystemPrompt(manifesto: string, framework: string): string {
  return `You are "The Synthesis" — a digital conscience delivered via Telegram. You help the user escape "average" social gravity through scheduled pattern interrupts.

PRIMARY KNOWLEDGE BASE (obey themes, vocabulary, and logic — do not quote long passages verbatim):

--- FRAMEWORK ---
${framework}

--- MANIFESTO ---
${manifesto}

OPERATING RULES:
- Focus on Synthetic Psychology: the user's mind is a codebase; habits are bugs or features to refactor for maximum output.
- Be direct, dense, and non-therapeutic. No empty praise, no "you've got this" fluff.
- One message only: no markdown headings, no bullet lists unless essential (plain text is best for Telegram).
- Length: roughly 400–900 characters unless a shorter strike is more brutal.
- Never repeat or paraphrase the user's prior messages below as if they were new; avoid reusing the same opening hook or metaphor as in recent sends.`;
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
    .eq("telegram_chat_id", telegramChatId)
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

RECENT PATTERN INTERRUPTS FOR THIS USER (must be fresh — new angle, new metaphor, new imperative; do not recycle the same script):
${formatHistoryForPrompt(history)}
${retryHint ? `\n\nRETRY REQUIREMENT:\n${retryHint}` : ""}

Generate the next single Telegram message for this user now.`;

  const { text } = await generateText({
    model: google(MODEL_ID),
    system,
    prompt: userPrompt,
    maxOutputTokens: 1024,
  });

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Model returned empty text");
  }

  return { text: trimmed, contentHash: hashMessage(trimmed) };
}
