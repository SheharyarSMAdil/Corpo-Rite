import OpenAI from "openai";
import {
  DEFAULT_MODEL,
  FORMALITY_LEVELS,
  LENGTH_MODIFIERS,
} from "./constants";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type RewriteSettings = {
  formality?: keyof typeof FORMALITY_LEVELS;
  preserveTone?: boolean;
};

function buildSystemPrompt(settings: RewriteSettings) {
  const formality =
    FORMALITY_LEVELS[settings.formality ?? "professional"] ??
    FORMALITY_LEVELS.professional;
  const toneLine = settings.preserveTone
    ? "Preserve the speaker's original intent, warmth, and personality while fixing grammar and clarity."
    : "Optimize for neutral corporate tone; do not mirror casual Hinglish phrasing.";

  return `You are CorpoRite, an expert assistant that converts Hinglish (Hindi written in Roman/Latin script, often mixed with English) into polished corporate English.

Rules:
- Input may be Hinglish, Roman Hindi, or informal Indian English. Detect and rewrite only what needs improvement.
- ${formality.instruction}
- ${toneLine}
- Keep names, numbers, dates, and product terms unchanged unless clearly wrong.
- If the input is already correct professional English, return it unchanged.
- Return ONLY the rewritten text. No quotes, labels, or explanation.`;
}

function buildUserPrompt(text: string, lengthMode: string | null) {
  if (lengthMode === "extend") {
    return `Rewrite this text for corporate use. ${LENGTH_MODIFIERS.extend}\n\n${text}`;
  }
  if (lengthMode === "shorten") {
    return `Rewrite this text for corporate use. ${LENGTH_MODIFIERS.shorten}\n\n${text}`;
  }
  return `Rewrite this text for corporate use:\n\n${text}`;
}

export async function rewriteText(
  text: string,
  settings: RewriteSettings,
  lengthMode: string | null = null,
): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI is not configured");
  }

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: settings.preserveTone ? 0.5 : 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(settings) },
      { role: "user", content: buildUserPrompt(text, lengthMode) },
    ],
    max_tokens: 1024,
  });

  const suggestion = response.choices[0]?.message?.content?.trim();
  if (!suggestion) throw new Error("Empty response from API");
  return suggestion;
}
