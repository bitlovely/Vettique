import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

async function upsertProfilePlan(params: {
  userId: string;
  plan: "free" | "pro";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const supabase = createAdminClient();
  console.log("[stripe-webhook] upsertProfilePlan:start", {
    userId: params.userId,
    plan: params.plan,
    stripeCustomerId: params.stripeCustomerId ?? null,
    stripeSubscriptionId: params.stripeSubscriptionId ?? null,
  });
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
  console.log("[stripe-webhook] upsertProfilePlan:done", {
    userId: params.userId,
    plan: params.plan,
  });
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
    console.error("[stripe-webhook] signature verification failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    console.log("[stripe-webhook] received", {
      type: event.type,
      id: event.id,
    });
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session?.metadata?.supabase_user_id as string | undefined;
        console.log("[stripe-webhook] checkout.session.completed", {
          userId: userId ?? null,
          customerId: session?.customer ?? null,
          subscriptionId: session?.subscription ?? null,
        });
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
        const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);

        console.log("[stripe-webhook] subscription event", {
          type: event.type,
          customerId: customerId ?? null,
          subscriptionId: sub.id ?? null,
          status: status ?? null,
          cancelAtPeriodEnd,
        });

        // Find userId via profiles.stripe_customer_id
        if (customerId) {
          const supabase = createAdminClient();
          const { data } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          const userId = data?.user_id as string | undefined;
          console.log("[stripe-webhook] customer lookup", {
            customerId,
            matchedUserId: userId ?? null,
          });
          if (userId) {
            const isActive =
              status === "active" || status === "trialing" || status === "past_due";
            console.log("[stripe-webhook] subscription plan decision", {
              userId,
              status,
              cancelAtPeriodEnd,
              nextPlan: isActive ? "pro" : "free",
            });
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
        console.log("[stripe-webhook] ignored event", { type: event.type });
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handling error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

