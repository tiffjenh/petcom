import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  planFromPriceId,
  getSubscriptionPriceId,
  type PlanFromPrice,
} from "@/lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

function subscriptionStatusFromStripe(status: Stripe.Subscription.Status): "active" | "canceled" | "past_due" {
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  return "canceled";
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const clerkId = session.metadata?.clerkId;
      if (!clerkId || !subscriptionId) break;
      const user = await prisma.user.findUnique({
        where: { clerkId },
      });
      if (!user) break;
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });
      const priceId = getSubscriptionPriceId(sub);
      const plan: PlanFromPrice = planFromPriceId(priceId) ?? "pro";
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan,
          stripeId: subscriptionId,
          status: subscriptionStatusFromStripe(sub.status),
          renewsAt: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
        },
        update: {
          stripeId: subscriptionId,
          plan,
          status: subscriptionStatusFromStripe(sub.status),
          renewsAt: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findFirst({
        where: { stripeId: subscription.id },
      });
      if (existing) {
        const priceId = getSubscriptionPriceId(subscription);
        const plan: PlanFromPrice = (planFromPriceId(priceId) ?? existing.plan) as PlanFromPrice;
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan,
            status: subscriptionStatusFromStripe(subscription.status),
            renewsAt: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findFirst({
        where: { stripeId: subscription.id },
      });
      if (existing) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: "free",
            status: "canceled",
            renewsAt: null,
          },
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
