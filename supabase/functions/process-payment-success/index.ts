import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
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

    console.log(`Processing payment success for user ${user.id}, PI: ${paymentIntentId}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Payment not successful", status: paymentIntent.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (paymentIntent.metadata.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Payment does not belong to user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEntry } = await supabaseService
      .from("ledger_entries")
      .select("id")
      .eq("ref_id", paymentIntentId)
      .eq("ref_type", "DEPOSIT")
      .maybeSingle();

    if (existingEntry) {
      console.log(`Payment ${paymentIntentId} already processed`);
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountCents = paymentIntent.amount;
    const journalId = crypto.randomUUID();

    let { data: account } = await supabaseService
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("user_id", user.id)
      .eq("kind", "available")
      .eq("currency", "USD")
      .maybeSingle();

    if (!account) {
      const { data: newAccount, error: createError } = await supabaseService
        .from("ledger_accounts")
        .insert({ user_id: user.id, kind: "available", currency: "USD", balance_cents: 0 })
        .select("id, balance_cents")
        .single();

      if (createError) {
        console.error("Error creating account:", createError);
        throw createError;
      }

      account = newAccount;
    }

    const { error: entryError } = await supabaseService.from("ledger_entries").insert({
      journal_id: journalId,
      account_id: account.id,
      amount_cents: amountCents,
      ref_type: "DEPOSIT",
      ref_id: paymentIntentId,
      metadata: { payment_intent_id: paymentIntentId, user_id: user.id, source: "frontend" },
    });

    if (entryError) {
      console.error("Error creating ledger entry:", entryError);
      throw entryError;
    }

    const newBalance = account.balance_cents + amountCents;
    const { error: updateError } = await supabaseService
      .from("ledger_accounts")
      .update({ balance_cents: newBalance })
      .eq("id", account.id);

    if (updateError) {
      console.error("Error updating balance:", updateError);
      throw updateError;
    }

    console.log(`Successfully deposited ${amountCents} cents to user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        amount_cents: amountCents,
        new_balance_cents: newBalance
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});