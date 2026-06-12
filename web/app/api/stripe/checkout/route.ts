import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPackById, getStripePriceId, requireStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  packId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const pack = getPackById(parsed.data.packId);
    if (!pack) {
      return NextResponse.json({ error: "Unknown pack" }, { status: 400 });
    }

    const priceId = getStripePriceId(parsed.data.packId);
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 503 },
      );
    }

    const stripe = requireStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
      metadata: {
        userId: session.user.id,
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
