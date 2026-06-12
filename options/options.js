import { API_BASE_URL, DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";
import { parseAllowedSites } from "../shared/siteMatcherModule.js";
import { fetchCredits, getAuthToken, signInWithGoogle, signOut } from "../shared/auth.js";

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
  document.getElementById("formality").value = settings.formality || "professional";
  document.getElementById("preserveTone").checked = Boolean(settings.preserveTone);
  document.getElementById("autoSuggest").checked = Boolean(settings.autoSuggest);
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

async function refreshAccountUI() {
  const signedIn = Boolean(await getAuthToken());
  document.getElementById("accountSignedOut").hidden = signedIn;
  document.getElementById("accountSignedIn").hidden = !signedIn;

  if (signedIn) {
    const data = await fetchCredits();
    document.getElementById("creditsBalance").textContent =
      data?.balance !== undefined ? String(data.balance) : "—";
    document.getElementById("accountEmail").textContent =
      data?.email ? `Signed in as ${data.email}` : "Signed in";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  fillForm(settings);
  setAllowedSitesEnabled(settings.restrictToSites);
  await refreshAccountUI();

  document.getElementById("restrictToSites").addEventListener("change", (e) => {
    setAllowedSitesEnabled(e.target.checked);
  });

  document.getElementById("signInBtn").addEventListener("click", async () => {
    const btn = document.getElementById("signInBtn");
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await signInWithGoogle();
      await refreshAccountUI();
    } catch (err) {
      alert(err.message || "Sign-in failed");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in with Google";
    }
  });

  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await signOut();
    await refreshAccountUI();
  });

  document.getElementById("openDashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: `${API_BASE_URL}/dashboard` });
  });

  document.getElementById("openPrivacy").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE_URL}/privacy` });
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
      formality: document.getElementById("formality").value,
      preserveTone: document.getElementById("preserveTone").checked,
      autoSuggest: document.getElementById("autoSuggest").checked,
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
