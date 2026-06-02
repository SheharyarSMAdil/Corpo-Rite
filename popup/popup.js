import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.settings] };
}

async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: next });
  return next;
}

function setStatus(hasApiKey, enabled) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  dot.className = "dot";
  if (!hasApiKey) {
    dot.classList.add("warn");
    text.textContent = "Add API key in settings to enable AI";
  } else if (!enabled) {
    dot.classList.add("warn");
    text.textContent = "CorpoRite is paused";
  } else {
    dot.classList.add("ok");
    text.textContent = "Ready on all websites";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();

  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("autoSuggest").checked = settings.autoSuggest;
  document.getElementById("formality").value = settings.formality;
  document.getElementById("preserveTone").checked = settings.preserveTone;

  setStatus(Boolean(settings.apiKey?.trim()), settings.enabled);

  document.getElementById("enabled").addEventListener("change", async (e) => {
    const s = await saveSettings({ enabled: e.target.checked });
    setStatus(Boolean(s.apiKey?.trim()), s.enabled);
  });

  document.getElementById("autoSuggest").addEventListener("change", (e) => {
    saveSettings({ autoSuggest: e.target.checked });
  });

  document.getElementById("formality").addEventListener("change", (e) => {
    saveSettings({ formality: e.target.value });
  });

  document.getElementById("preserveTone").addEventListener("change", (e) => {
    saveSettings({ preserveTone: e.target.checked });
  });

  document.getElementById("openOptions").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
