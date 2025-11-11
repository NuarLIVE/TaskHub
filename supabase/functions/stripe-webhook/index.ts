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
      console.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WEBHOOK] Received event: ${event.type} id=${event.id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if event already processed (idempotency)
    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[WEBHOOK] Event ${event.id} already processed`);
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store event for idempotency
    await supabase.from("stripe_events").insert({
      id: event.id,
      type: event.type,
      data: event.data,
    });

    // Handle different event types
    switch (event.type) {
      case "payment_intent.processing":
        await handlePaymentIntentProcessing(supabase, event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(supabase, event.data.object as Stripe.PaymentIntent);
        break;

      case "account.updated":
        await handleAccountUpdated(supabase, event.data.object as Stripe.Account);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handlePaymentIntentProcessing(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const piId = paymentIntent.id;
  console.log(`[WEBHOOK] payment_intent.processing pi=${piId}`);

  // Update status to processing
  const { error } = await supabase
    .from("wallet_ledger")
    .update({ status: "processing" })
    .eq("stripe_pi_id", piId)
    .eq("kind", "deposit");

  if (error) {
    console.error(`[WEBHOOK] Failed to update status to processing: ${error.message}`);
  } else {
    console.log(`[WEBHOOK] Updated deposit status to processing for pi=${piId}`);
  }
}

async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const piId = paymentIntent.id;
  console.log(`[WEBHOOK] payment_intent.succeeded pi=${piId} amount=${paymentIntent.amount}`);

  // Find the deposit record by stripe_pi_id
  const { data: deposit, error: findError } = await supabase
    .from("wallet_ledger")
    .select("*")
    .eq("stripe_pi_id", piId)
    .eq("kind", "deposit")
    .maybeSingle();

  if (findError) {
    console.error(`[WEBHOOK] Error finding deposit: ${findError.message}`);
    return;
  }

  if (!deposit) {
    console.error(`[WEBHOOK] No deposit found for pi=${piId}`);
    return;
  }

  if (deposit.status === "succeeded") {
    console.log(`[WEBHOOK] Deposit ${deposit.id} already succeeded (idempotent)`);
    return;
  }

  // Update status to succeeded
  const { error: updateError } = await supabase
    .from("wallet_ledger")
    .update({
      status: "succeeded",
      metadata: {
        ...deposit.metadata,
        stripe_status: paymentIntent.status,
        succeeded_at: new Date().toISOString(),
      },
    })
    .eq("id", deposit.id);

  if (updateError) {
    console.error(`[WEBHOOK] Failed to update deposit: ${updateError.message}`);
    throw updateError;
  }

  console.log(`[WEBHOOK] Deposit ${deposit.id} marked as succeeded for user=${deposit.user_id} amount=${deposit.amount_minor}`);
}

async function handlePaymentIntentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const piId = paymentIntent.id;
  console.log(`[WEBHOOK] payment_intent.payment_failed pi=${piId}`);

  const { error } = await supabase
    .from("wallet_ledger")
    .update({
      status: "failed",
      metadata: {
        stripe_status: paymentIntent.status,
        failure_message: paymentIntent.last_payment_error?.message,
        failed_at: new Date().toISOString(),
      },
    })
    .eq("stripe_pi_id", piId)
    .eq("kind", "deposit");

  if (error) {
    console.error(`[WEBHOOK] Failed to update status to failed: ${error.message}`);
  } else {
    console.log(`[WEBHOOK] Updated deposit status to failed for pi=${piId}`);
  }
}

async function handlePaymentIntentCanceled(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const piId = paymentIntent.id;
  console.log(`[WEBHOOK] payment_intent.canceled pi=${piId}`);

  const { error } = await supabase
    .from("wallet_ledger")
    .update({
      status: "canceled",
      metadata: {
        stripe_status: paymentIntent.status,
        canceled_at: new Date().toISOString(),
      },
    })
    .eq("stripe_pi_id", piId)
    .eq("kind", "deposit");

  if (error) {
    console.error(`[WEBHOOK] Failed to update status to canceled: ${error.message}`);
  } else {
    console.log(`[WEBHOOK] Updated deposit status to canceled for pi=${piId}`);
  }
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

  console.log(`[WEBHOOK] Updated account ${account.id} status`);
}
