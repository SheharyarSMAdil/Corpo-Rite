import { FORMALITY_LEVELS, DEFAULT_SETTINGS, STORAGE_KEYS, LENGTH_MODIFIERS } from "./shared/constants.js";

async function getSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.settings] };
}

function buildSystemPrompt(settings) {
  const formality = FORMALITY_LEVELS[settings.formality] ?? FORMALITY_LEVELS.professional;
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
- If conversation context is provided, use it only for tone and clarity. Do not reply to the context.
- Return ONLY the rewritten text. No quotes, labels, or explanation.`;
}

function buildUserPrompt(text, lengthMode, chatContext) {
  let lengthInstruction = "";
  if (lengthMode === "extend") {
    lengthInstruction = ` ${LENGTH_MODIFIERS.extend}`;
  } else if (lengthMode === "shorten") {
    lengthInstruction = ` ${LENGTH_MODIFIERS.shorten}`;
  }

  const contextBlock = chatContext?.trim()
    ? `Conversation context (for tone and clarity only — do not reply to this; rewrite only the message below):\n${chatContext.trim()}\n\n`
    : "";

  return `Rewrite this text for corporate use.${lengthInstruction}\n\n${contextBlock}Message to rewrite:\n${text}`;
}

async function rewriteWithOpenAI(text, settings, lengthMode = null, chatContext = "") {
  if (!settings.apiKey?.trim()) {
    throw new Error("NO_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      temperature: settings.preserveTone ? 0.5 : 0.3,
      messages: [
        { role: "system", content: buildSystemPrompt(settings) },
        { role: "user", content: buildUserPrompt(text, lengthMode, chatContext) },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err?.error?.message || `API error (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const suggestion = data.choices?.[0]?.message?.content?.trim();
  if (!suggestion) throw new Error("Empty response from API");
  return suggestion;
}

async function generateReplyWithOpenAI(chatContext, settings, draftHint = "") {
  if (!settings.apiKey?.trim()) {
    throw new Error("NO_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      temperature: settings.preserveTone ? 0.5 : 0.4,
      messages: [
        { role: "system", content: buildGenerateReplySystemPrompt(settings) },
        { role: "user", content: buildGenerateReplyUserPrompt(chatContext, draftHint) },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err?.error?.message || `API error (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const suggestion = data.choices?.[0]?.message?.content?.trim();
  if (!suggestion) throw new Error("Empty response from API");
  return suggestion;
}

function buildGenerateReplySystemPrompt(settings) {
  const formality = FORMALITY_LEVELS[settings.formality] ?? FORMALITY_LEVELS.professional;
  const toneLine = settings.preserveTone
    ? "Match the user's natural warmth and personality while staying workplace-appropriate."
    : "Use clear, neutral corporate tone suitable for professional messaging.";

  return `You are CorpoRite, an expert assistant that writes polished corporate English replies for workplace chat, email, and messaging apps.

Rules:
- ${formality.instruction}
- ${toneLine}
- Read the conversation context and write a reply the user can send next.
- Keep names, numbers, dates, and product terms accurate.
- Return ONLY the reply message. No quotes, labels, or explanation.`;
}

function buildGenerateReplyUserPrompt(chatContext, draftHint) {
  let prompt = `Conversation context:\n${chatContext.trim()}\n\n`;
  if (draftHint?.trim()) {
    prompt += `Optional notes or draft from the user (use for intent; do not copy verbatim unless it already reads well):\n${draftHint.trim()}\n\n`;
  }
  prompt += "Write a professional reply the user can send.";
  return prompt;
}

async function triggerSuggestOnActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SUGGEST" });
  } catch {
    // chrome://, Web Store, or page not yet loaded
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REWRITE") {
    (async () => {
      try {
        const settings = await getSettings();
        if (!settings.enabled) {
          sendResponse({ ok: false, error: "Extension is disabled" });
          return;
        }
        const suggestion = await rewriteWithOpenAI(
          message.text,
          settings,
          message.lengthMode,
          message.chatContext
        );
        sendResponse({ ok: true, suggestion });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Rewrite failed" });
      }
    })();
    return true;
  }

  if (message.type === "GENERATE_REPLY") {
    (async () => {
      try {
        const settings = await getSettings();
        if (!settings.enabled) {
          sendResponse({ ok: false, error: "Extension is disabled" });
          return;
        }
        if (!message.chatContext?.trim()) {
          sendResponse({ ok: false, error: "Chat context is required" });
          return;
        }
        const suggestion = await generateReplyWithOpenAI(
          message.chatContext,
          settings,
          message.draftHint
        );
        sendResponse({ ok: true, suggestion });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Reply generation failed" });
      }
    })();
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    getSettings().then((settings) => {
      const { apiKey, ...safe } = settings;
      sendResponse({ ok: true, settings: { ...safe, hasApiKey: Boolean(apiKey?.trim()) } });
    });
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-suggestion") await triggerSuggestOnActiveTab();
});
