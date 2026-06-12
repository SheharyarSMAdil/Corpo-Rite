import { API_BASE_URL, STORAGE_KEYS } from "./constants.js";

export async function getAuthToken() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.authToken);
  return result[STORAGE_KEYS.authToken]?.trim() || "";
}

export async function setAuthToken(token) {
  if (token) {
    await chrome.storage.local.set({ [STORAGE_KEYS.authToken]: token });
  } else {
    await chrome.storage.local.remove(STORAGE_KEYS.authToken);
  }
}

export async function isSignedIn() {
  return Boolean(await getAuthToken());
}

export async function signInWithGoogle() {
  const redirectUrl = chrome.identity.getRedirectURL();
  const authUrl = `${API_BASE_URL}/auth/extension?redirect_uri=${encodeURIComponent(redirectUrl)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!responseUrl) {
        reject(new Error("Sign-in was cancelled"));
        return;
      }

      let token = null;
      try {
        const url = new URL(responseUrl);
        token = url.hash.match(/token=([^&]+)/)?.[1];
      } catch {
        token = responseUrl.match(/[#&]token=([^&]+)/)?.[1];
      }

      if (!token) {
        reject(new Error("No token received"));
        return;
      }

      const decoded = decodeURIComponent(token);
      setAuthToken(decoded).then(() => resolve(decoded));
    });
  });
}

export async function signOut() {
  await setAuthToken(null);
}

export async function fetchCredits() {
  const token = await getAuthToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/api/credits`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  return response.json();
}
