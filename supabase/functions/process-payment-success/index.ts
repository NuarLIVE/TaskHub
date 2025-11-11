import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Internal-Token",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const internalToken = req.headers.get("X-Internal-Token");
    const expectedToken = Deno.env.get("INTERNAL_TOKEN");

    if (!internalToken || !expectedToken || internalToken !== expectedToken) {
      console.error("[PROCESS-PI] Missing or invalid internal token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ error: "Payment intent ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PROCESS-PI] id=${paymentIntentId}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log(`[PROCESS-PI] status=${paymentIntent.status}`);

    const allowedStatuses = ["succeeded", "processing", "requires_capture"];
    if (!allowedStatuses.includes(paymentIntent.status)) {
      console.log(`[PROCESS-PI] Invalid status: ${paymentIntent.status}`);
      return new Response(
        JSON.stringify({ error: "Payment not in valid state", status: paymentIntent.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = paymentIntent.metadata.user_id;

    if (!userId) {
      console.error(`[PROCESS-PI] Missing user_id in metadata for pi=${paymentIntentId}`);
      return new Response(
        JSON.stringify({ error: "Missing user_id in payment metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PROCESS-PI] user=${userId} amount=${paymentIntent.amount}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEntry } = await supabase
      .from("ledger_entries")
      .select("id")
      .eq("stripe_pi_id", paymentIntentId)
      .eq("ref_type", "DEPOSIT")
      .maybeSingle();

    if (existingEntry) {
      console.log(`[IDEMPOTENT SKIP] pi=${paymentIntentId}`);
      return new Response(
        JSON.stringify({ credited: true, message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountCents = paymentIntent.amount;
    const journalId = crypto.randomUUID();

    let { data: account } = await supabase
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("user_id", userId)
      .eq("kind", "available")
      .eq("currency", "USD")
      .maybeSingle();

    if (!account) {
      const { data: newAccount, error: createError } = await supabase
        .from("ledger_accounts")
        .insert({ user_id: userId, kind: "available", currency: "USD", balance_cents: 0 })
        .select("id, balance_cents")
        .single();

      if (createError) {
        console.error("[LEDGER UPSERT] Error creating account:", createError);
        throw createError;
      }

      account = newAccount;
      console.log(`[LEDGER UPSERT] Created new account for user=${userId}`);
    }

    const { error: entryError } = await supabase.from("ledger_entries").insert({
      journal_id: journalId,
      account_id: account.id,
      amount_cents: amountCents,
      ref_type: "DEPOSIT",
      ref_id: paymentIntentId,
      stripe_pi_id: paymentIntentId,
      metadata: {
        payment_intent_id: paymentIntentId,
        user_id: userId,
        deposit_id: paymentIntent.metadata.deposit_id,
        origin: paymentIntent.metadata.origin
      },
    });

    if (entryError) {
      console.error("[LEDGER UPSERT] Error creating ledger entry:", entryError);
      throw entryError;
    }

    console.log(`[LEDGER UPSERT] user=${userId} amount=${amountCents}`);

    const newBalance = account.balance_cents + amountCents;
    const { error: updateError } = await supabase
      .from("ledger_accounts")
      .update({ balance_cents: newBalance })
      .eq("id", account.id);

    if (updateError) {
      console.error("[LEDGER UPSERT] Error updating balance:", updateError);
      throw updateError;
    }

    console.log(`[DEPOSIT] user=${userId} pi=${paymentIntentId} amount=${amountCents} credited`);

    return new Response(
      JSON.stringify({
        credited: true,
        amount_cents: amountCents,
        new_balance_cents: newBalance
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PROCESS-PI] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});