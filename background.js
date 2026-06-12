import { DEFAULT_SETTINGS, STORAGE_KEYS, API_BASE_URL } from "./shared/constants.js";
import { getAuthToken } from "./shared/auth.js";

async function getSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.settings] };
}

async function rewriteViaBackend(text, settings, lengthMode = null) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("NO_TOKEN");
  }

  const response = await fetch(`${API_BASE_URL}/api/rewrite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text,
      formality: settings.formality,
      preserveTone: settings.preserveTone,
      lengthMode,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (data.error === "NO_CREDITS") throw new Error("NO_CREDITS");
    if (data.error === "NO_TOKEN") throw new Error("NO_TOKEN");
    throw new Error(data.error || `API error (${response.status})`);
  }

  const suggestion = data.suggestion?.trim();
  if (!suggestion) throw new Error("Empty response from API");
  return { suggestion, creditsRemaining: data.creditsRemaining };
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
        const result = await rewriteViaBackend(message.text, settings, message.lengthMode);
        sendResponse({
          ok: true,
          suggestion: result.suggestion,
          creditsRemaining: result.creditsRemaining,
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Rewrite failed" });
      }
    })();
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    (async () => {
      const settings = await getSettings();
      const signedIn = Boolean(await getAuthToken());
      sendResponse({
        ok: true,
        settings: { ...settings, isSignedIn: signedIn },
      });
    })();
    return true;
  }

  if (message.type === "GET_CREDITS") {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ ok: false, error: "NO_TOKEN" });
          return;
        }
        const response = await fetch(`${API_BASE_URL}/api/credits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          sendResponse({ ok: false, error: data.error || "Failed to load credits" });
          return;
        }
        sendResponse({ ok: true, ...data });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Failed to load credits" });
      }
    })();
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-suggestion") await triggerSuggestOnActiveTab();
});
