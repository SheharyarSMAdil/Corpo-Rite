import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.settings] };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: settings });
}

function fillForm(settings) {
  document.getElementById("apiKey").value = settings.apiKey || "";
  document.getElementById("model").value = settings.model || "gpt-4o-mini";
  document.getElementById("formality").value = settings.formality || "professional";
  document.getElementById("preserveTone").checked = Boolean(settings.preserveTone);
  document.getElementById("autoSuggest").checked = Boolean(settings.autoSuggest);
  document.getElementById("debounceMs").value = settings.debounceMs ?? 700;
  document.getElementById("minChars").value = settings.minChars ?? 8;
  document.getElementById("enabled").checked = settings.enabled !== false;
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  fillForm(settings);

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

  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const next = {
      ...settings,
      apiKey: document.getElementById("apiKey").value.trim(),
      model: document.getElementById("model").value,
      formality: document.getElementById("formality").value,
      preserveTone: document.getElementById("preserveTone").checked,
      autoSuggest: document.getElementById("autoSuggest").checked,
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
