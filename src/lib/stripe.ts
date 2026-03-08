/**
 * Stripe price IDs and plan mapping.
 * Set in env: STRIPE_FREE_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_FAMILY_PRICE_ID
 */

export const STRIPE_PRICE_IDS = {
  free: process.env.STRIPE_FREE_PRICE_ID ?? null,
  pro: process.env.STRIPE_PRO_PRICE_ID ?? process.env.STRIPE_PRICE_ID_PRO ?? null,
  family: process.env.STRIPE_FAMILY_PRICE_ID ?? null,
} as const;

export type PlanFromPrice = "free" | "pro" | "family";

/** Resolve Stripe price ID to plan. Returns null if no match. */
export function planFromPriceId(priceId: string | null | undefined): PlanFromPrice | null {
  if (!priceId) return null;
  if (STRIPE_PRICE_IDS.free && priceId === STRIPE_PRICE_IDS.free) return "free";
  if (STRIPE_PRICE_IDS.pro && priceId === STRIPE_PRICE_IDS.pro) return "pro";
  if (STRIPE_PRICE_IDS.family && priceId === STRIPE_PRICE_IDS.family) return "family";
  return null;
}

/** Get the first subscription item's price id from a Stripe subscription. */
export function getSubscriptionPriceId(
  subscription: { items?: { data?: Array<{ price?: { id?: string } }> } }
): string | null {
  const id = subscription.items?.data?.[0]?.price?.id;
  return id ?? null;
}
