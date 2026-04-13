import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

async function upsertProfilePlan(params: {
  userId: string;
  plan: "free" | "pro";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .upsert(
      {
        user_id: params.userId,
        plan: params.plan,
        stripe_customer_id: params.stripeCustomerId ?? null,
        stripe_subscription_id: params.stripeSubscriptionId ?? null,
      },
      { onConflict: "user_id" },
    );
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session?.metadata?.supabase_user_id as string | undefined;
        if (userId) {
          await upsertProfilePlan({
            userId,
            plan: "pro",
            stripeCustomerId: session.customer ?? null,
            stripeSubscriptionId: session.subscription ?? null,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string | undefined;
        const status = sub.status as string | undefined;

        // Find userId via profiles.stripe_customer_id
        if (customerId) {
          const supabase = await createClient();
          const { data } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          const userId = data?.user_id as string | undefined;
          if (userId) {
            const isActive =
              status === "active" || status === "trialing" || status === "past_due";
            await upsertProfilePlan({
              userId,
              plan: isActive ? "pro" : "free",
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id ?? null,
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handling error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

