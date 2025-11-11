import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Missing signature or webhook secret" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed`);
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("stripe_events").insert({
      id: event.id,
      type: event.type,
      data: event.data,
    });

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      
      case "transfer.created":
        console.log("Transfer created:", event.data.object.id);
        break;
      
      case "transfer.reversed":
        console.log("Transfer reversed:", event.data.object.id);
        break;
      
      case "account.updated":
        await handleAccountUpdated(supabase, event.data.object as Stripe.Account);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log("=== Processing payment_intent.succeeded ===");
  console.log("Payment Intent ID:", paymentIntent.id);
  console.log("Amount:", paymentIntent.amount);
  console.log("Metadata:", paymentIntent.metadata);

  const userId = paymentIntent.metadata.user_id;

  if (!userId) {
    console.error("❌ No user_id in payment intent metadata");
    return;
  }

  const amountCents = paymentIntent.amount;
  const journalId = crypto.randomUUID();

  console.log(`Processing deposit for user ${userId}: ${amountCents} cents`);

  const { data: account, error: accountError } = await supabase
    .from("ledger_accounts")
    .select("id, balance_cents")
    .eq("user_id", userId)
    .eq("kind", "available")
    .eq("currency", "USD")
    .maybeSingle();

  if (accountError) {
    console.error("❌ Error fetching account:", accountError);
    throw accountError;
  }

  let accountId: string;
  let currentBalance: number;

  if (!account) {
    console.log("Creating new account for user");
    const { data: newAccount, error: createError } = await supabase
      .from("ledger_accounts")
      .insert({ user_id: userId, kind: "available", currency: "USD", balance_cents: 0 })
      .select("id, balance_cents")
      .single();

    if (createError) {
      console.error("❌ Error creating account:", createError);
      throw createError;
    }

    accountId = newAccount.id;
    currentBalance = newAccount.balance_cents;
    console.log("✅ Created new account:", accountId);
  } else {
    accountId = account.id;
    currentBalance = account.balance_cents;
    console.log("✅ Found existing account:", accountId, "with balance:", currentBalance);
  }

  const { error: entryError } = await supabase.from("ledger_entries").insert({
    journal_id: journalId,
    account_id: accountId,
    amount_cents: amountCents,
    ref_type: "DEPOSIT",
    ref_id: paymentIntent.id,
    metadata: { payment_intent_id: paymentIntent.id, user_id: userId },
  });

  if (entryError) {
    console.error("❌ Error creating ledger entry:", entryError);
    throw entryError;
  }

  console.log("✅ Created ledger entry");

  const newBalance = currentBalance + amountCents;
  const { error: updateError } = await supabase
    .from("ledger_accounts")
    .update({ balance_cents: newBalance })
    .eq("id", accountId);

  if (updateError) {
    console.error("❌ Error updating balance:", updateError);
    throw updateError;
  }

  console.log(`✅ Updated balance from ${currentBalance} to ${newBalance}`);
  console.log(`✅ Successfully deposited ${amountCents} cents to user ${userId}`);
}

async function handlePaymentIntentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment failed for intent ${paymentIntent.id}`);
}

async function handleAccountUpdated(supabase: any, account: Stripe.Account) {
  await supabase
    .from("profiles")
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_onboarded_at: account.charges_enabled && account.payouts_enabled 
        ? new Date().toISOString() 
        : null,
    })
    .eq("stripe_account_id", account.id);

  console.log(`Updated account ${account.id} status`);
}