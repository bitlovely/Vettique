import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export async function POST() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const priceId = process.env.STRIPE_PRICE_ID_PRO;

  if (!siteUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SITE_URL" },
      { status: 400 },
    );
  }
  if (!priceId) {
    return NextResponse.json(
      { error: "Missing STRIPE_PRICE_ID_PRO" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/analyze?upgraded=1`,
    cancel_url: `${siteUrl}/analyze?upgraded=0`,
    customer_email: user.email ?? undefined,
    metadata: {
      supabase_user_id: user.id,
    },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}

