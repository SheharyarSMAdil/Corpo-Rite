import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";
import { isUrlAllowed } from "../shared/siteMatcherModule.js";

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

async function isCurrentTabAllowed(settings) {
  if (!settings.restrictToSites) return true;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return false;
  try {
    return isUrlAllowed(new URL(tab.url), settings);
  } catch {
    return false;
  }
}

async function setStatus(settings) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const hasApiKey = Boolean(settings.apiKey?.trim());
  const onAllowedSite = await isCurrentTabAllowed(settings);

  dot.className = "dot";
  if (!hasApiKey) {
    dot.classList.add("warn");
    text.textContent = "Add API key in settings to enable AI";
  } else if (!settings.enabled) {
    dot.classList.add("warn");
    text.textContent = "CorpoRite is paused";
  } else if (!onAllowedSite) {
    dot.classList.add("warn");
    text.textContent = "Not enabled on this website";
  } else {
    dot.classList.add("ok");
    text.textContent = settings.restrictToSites ? "Ready on allowed websites" : "Ready on all websites";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();

  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("autoSuggest").checked = settings.autoSuggest;
  document.getElementById("formality").value = settings.formality;
  document.getElementById("preserveTone").checked = settings.preserveTone;

  await setStatus(settings);

  document.getElementById("enabled").addEventListener("change", async (e) => {
    const s = await saveSettings({ enabled: e.target.checked });
    await setStatus(s);
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
