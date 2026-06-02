import { FORMALITY_LEVELS, DEFAULT_SETTINGS, STORAGE_KEYS } from "./shared/constants.js";

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
- Return ONLY the rewritten text. No quotes, labels, or explanation.`;
}

async function rewriteWithOpenAI(text, settings) {
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
        {
          role: "user",
          content: `Rewrite this text for corporate use:\n\n${text}`,
        },
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
        const suggestion = await rewriteWithOpenAI(message.text, settings);
        sendResponse({ ok: true, suggestion });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Rewrite failed" });
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
