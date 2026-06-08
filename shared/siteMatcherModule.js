export function parseAllowedSites(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function matchPattern(pattern, href, host) {
  const p = pattern.trim().toLowerCase();
  if (!p) return false;

  const h = (host || "").toLowerCase();
  const url = (href || "").toLowerCase();

  if (p.startsWith("http://") || p.startsWith("https://")) {
    return url.startsWith(p) || url.includes(p);
  }

  if (p.startsWith("/")) {
    try {
      return new URL(href).pathname.toLowerCase().includes(p);
    } catch {
      return false;
    }
  }

  if (h === p || h.endsWith("." + p)) return true;
  if (h.includes(p)) return true;
  return url.includes(p);
}

export function isUrlAllowed(location, settings) {
  if (!settings?.restrictToSites) return true;

  const patterns = parseAllowedSites(settings.allowedSites);
  if (patterns.length === 0) return false;

  const href = location?.href || "";
  const host = location?.hostname || "";

  return patterns.some((pattern) => matchPattern(pattern, href, host));
}
