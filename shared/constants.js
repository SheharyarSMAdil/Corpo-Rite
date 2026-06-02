export const FORMALITY_LEVELS = {
  casual: {
    label: "Casual professional",
    instruction:
      "Use clear, approachable business English. Friendly but still workplace-appropriate.",
  },
  professional: {
    label: "Professional",
    instruction:
      "Use standard corporate English suitable for emails, Slack, and internal updates.",
  },
  formal: {
    label: "Formal",
    instruction:
      "Use polished, formal business English suitable for client-facing communication.",
  },
  executive: {
    label: "Executive",
    instruction:
      "Use concise, authoritative executive tone. Direct, confident, and boardroom-ready.",
  },
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  autoSuggest: false,
  formality: "professional",
  preserveTone: false,
  debounceMs: 700,
  minChars: 8,
  apiKey: "",
  model: "gpt-4o-mini",
};

export const SHORTCUT_LABEL = "Alt+Shift+C";

export const STORAGE_KEYS = {
  settings: "corpwrite_settings",
};
