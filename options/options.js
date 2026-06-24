import { CHAT_CONTEXT_MAX_CHARS, DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";
import { parseAllowedSites } from "../shared/siteMatcherModule.js";

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.settings] };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: settings });
}

function allowedSitesToText(value) {
  const list = parseAllowedSites(value);
  return list.join("\n");
}

function textToAllowedSites(text) {
  return parseAllowedSites(text);
}

function fillForm(settings) {
  document.getElementById("apiKey").value = settings.apiKey || "";
  document.getElementById("model").value = settings.model || "gpt-4o-mini";
  document.getElementById("formality").value = settings.formality || "professional";
  document.getElementById("preserveTone").checked = Boolean(settings.preserveTone);
  document.getElementById("useChatContext").checked = settings.useChatContext !== false;
  document.getElementById("chatContext").value = settings.chatContext || "";
  document.getElementById("autoSuggest").checked = Boolean(settings.autoSuggest);
  document.getElementById("showLauncherIcon").checked = settings.showLauncherIcon !== false;
  document.getElementById("restrictToSites").checked = Boolean(settings.restrictToSites);
  document.getElementById("allowedSites").value = allowedSitesToText(settings.allowedSites);
  document.getElementById("debounceMs").value = settings.debounceMs ?? 700;
  document.getElementById("minChars").value = settings.minChars ?? 8;
  document.getElementById("enabled").checked = settings.enabled !== false;
}

function setAllowedSitesEnabled(enabled) {
  document.getElementById("allowedSites").disabled = !enabled;
  document.getElementById("addCurrentSite").disabled = !enabled;
}

function setChatContextEnabled(enabled) {
  document.getElementById("chatContext").disabled = !enabled;
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  fillForm(settings);
  setAllowedSitesEnabled(settings.restrictToSites);
  setChatContextEnabled(settings.useChatContext !== false);

  document.getElementById("restrictToSites").addEventListener("change", (e) => {
    setAllowedSitesEnabled(e.target.checked);
  });

  document.getElementById("useChatContext").addEventListener("change", (e) => {
    setChatContextEnabled(e.target.checked);
  });

  document.getElementById("toggleKey").addEventListener("click", () => {
    const input = document.getElementById("apiKey");
    const btn = document.getElementById("toggleKey");
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "Hide";
    } else {
      input.type = "password";
      btn.textContent = "Show";
    }
  });

  document.getElementById("openPrivacy").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("privacy-policy.html") });
  });

  document.getElementById("addCurrentSite").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url?.startsWith("http")) {
      alert("Open a regular website tab first, then add it here.");
      return;
    }

    let host;
    try {
      host = new URL(tab.url).hostname;
    } catch {
      return;
    }

    const textarea = document.getElementById("allowedSites");
    const existing = textToAllowedSites(textarea.value);
    if (existing.some((entry) => entry.toLowerCase() === host.toLowerCase())) return;

    textarea.value = existing.length ? `${textarea.value.trim()}\n${host}` : host;
    document.getElementById("restrictToSites").checked = true;
    setAllowedSitesEnabled(true);
  });

  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const next = {
      ...settings,
      apiKey: document.getElementById("apiKey").value.trim(),
      model: document.getElementById("model").value,
      formality: document.getElementById("formality").value,
      preserveTone: document.getElementById("preserveTone").checked,
      useChatContext: document.getElementById("useChatContext").checked,
      chatContext: document
        .getElementById("chatContext")
        .value.trim()
        .slice(0, CHAT_CONTEXT_MAX_CHARS),
      autoSuggest: document.getElementById("autoSuggest").checked,
      showLauncherIcon: document.getElementById("showLauncherIcon").checked,
      restrictToSites: document.getElementById("restrictToSites").checked,
      allowedSites: textToAllowedSites(document.getElementById("allowedSites").value),
      debounceMs: Number(document.getElementById("debounceMs").value) || 700,
      minChars: Number(document.getElementById("minChars").value) || 8,
      enabled: document.getElementById("enabled").checked,
    };
    await saveSettings(next);
    const status = document.getElementById("saveStatus");
    status.textContent = "Saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 2500);
  });
});
