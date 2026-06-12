import { API_BASE_URL, DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants.js";
import { isUrlAllowed } from "../shared/siteMatcherModule.js";
import { fetchCredits, getAuthToken, signInWithGoogle, signOut } from "../shared/auth.js";

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

function setAccountView(signedIn, balance = null) {
  document.getElementById("signedOutView").hidden = signedIn;
  document.getElementById("signedInView").hidden = !signedIn;
  if (signedIn && balance !== null) {
    document.getElementById("creditsBalance").textContent = String(balance);
  }
}

async function refreshCredits() {
  const signedIn = Boolean(await getAuthToken());
  if (!signedIn) {
    setAccountView(false);
    return null;
  }

  const data = await fetchCredits();
  if (data?.balance !== undefined) {
    setAccountView(true, data.balance);
    return data.balance;
  }
  setAccountView(true);
  return null;
}

async function setStatus(settings, creditsBalance = null) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const signedIn = Boolean(await getAuthToken());
  const onAllowedSite = await isCurrentTabAllowed(settings);

  dot.className = "dot";
  if (!signedIn) {
    dot.classList.add("warn");
    text.textContent = "Sign in to use CorpoRite";
  } else if (creditsBalance !== null && creditsBalance < 1) {
    dot.classList.add("warn");
    text.textContent = "No credits left — buy more on dashboard";
  } else if (!settings.enabled) {
    dot.classList.add("warn");
    text.textContent = "CorpoRite is paused";
  } else if (!onAllowedSite) {
    dot.classList.add("warn");
    text.textContent = "Not enabled on this website";
  } else {
    dot.classList.add("ok");
    const creditsNote =
      creditsBalance !== null ? ` · ${creditsBalance} credits` : "";
    text.textContent = settings.restrictToSites
      ? `Ready on allowed websites${creditsNote}`
      : `Ready on all websites${creditsNote}`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();

  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("autoSuggest").checked = settings.autoSuggest;
  document.getElementById("formality").value = settings.formality;
  document.getElementById("preserveTone").checked = settings.preserveTone;

  const balance = await refreshCredits();
  await setStatus(settings, balance);

  document.getElementById("signInBtn").addEventListener("click", async () => {
    const btn = document.getElementById("signInBtn");
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await signInWithGoogle();
      const newBalance = await refreshCredits();
      await setStatus(await loadSettings(), newBalance);
    } catch (err) {
      alert(err.message || "Sign-in failed");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in with Google";
    }
  });

  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await signOut();
    setAccountView(false);
    await setStatus(await loadSettings(), null);
  });

  document.getElementById("enabled").addEventListener("change", async (e) => {
    const s = await saveSettings({ enabled: e.target.checked });
    const bal = await refreshCredits();
    await setStatus(s, bal);
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

  document.getElementById("openDashboard").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE_URL}/dashboard/billing` });
  });
});
