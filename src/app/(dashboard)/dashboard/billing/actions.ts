"use server";

import { getOrCreateDbUser } from "@/lib/clerk-user";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { STRIPE_PRICE_IDS } from "@/lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function createCheckoutSessionForPlan(plan: "pro" | "family") {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const priceId = plan === "family" ? STRIPE_PRICE_IDS.family : STRIPE_PRICE_IDS.pro;
  if (!priceId) {
    if (plan === "family") redirect("/dashboard/account");
    redirect("/dashboard/billing");
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { clerkId: user.clerkId },
  });

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?success=${plan}`,
    cancel_url: `${baseUrl}/dashboard/account`,
    metadata: { clerkId: user.clerkId },
  });

  if (session.url) redirect(session.url);
  redirect("/dashboard/account");
}

export async function createCheckoutSession() {
  return createCheckoutSessionForPlan("pro");
}

export async function createFamilyCheckoutSession() {
  return createCheckoutSessionForPlan("family");
}
