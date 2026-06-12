import Stripe from "stripe";
import { CREDIT_PACKS } from "./constants";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function getStripePriceId(packId: string) {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  return process.env[pack.stripePriceEnv] ?? null;
}

export function getPackById(packId: string) {
  return CREDIT_PACKS.find((p) => p.id === packId) ?? null;
}

export function requireStripe() {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe;
}
