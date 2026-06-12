import { NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits } from "@/lib/credits";
import { requireStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = requireStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits ?? 0);

    if (userId && credits > 0) {
      await addCredits(userId, credits, "purchase", {
        stripeSessionId: session.id,
        packId: session.metadata?.packId,
      });
    }
  }

  return NextResponse.json({ received: true });
}
