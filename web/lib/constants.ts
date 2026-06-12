export const FREE_MONTHLY_CREDITS = 50;
export const CREDIT_COST_PER_REWRITE = 1;
export const DEFAULT_MODEL = "gpt-4o-mini";
export const EXTENSION_TOKEN_TTL_DAYS = 90;

export const CREDIT_PACKS = [
  {
    id: "pack_500",
    credits: 500,
    price: 5,
    label: "Starter",
    description: "500 rewrites",
    stripePriceEnv: "STRIPE_PRICE_500",
  },
  {
    id: "pack_2000",
    credits: 2000,
    price: 15,
    label: "Pro",
    description: "2,000 rewrites",
    stripePriceEnv: "STRIPE_PRICE_2000",
    popular: true,
  },
] as const;

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
} as const;

export const LENGTH_MODIFIERS = {
  extend:
    "Make the text noticeably longer with polite detail and clarity, without changing the core meaning.",
  shorten:
    "Make the text noticeably shorter and more concise while keeping the same meaning.",
} as const;
