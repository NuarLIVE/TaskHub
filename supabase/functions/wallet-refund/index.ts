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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { paymentIntentId, amountCents } = await req.json();

    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ error: "paymentIntentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    // Get payment intent to verify ownership
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to refund this payment" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Can only refund succeeded payments" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the charge from payment intent
    const charges = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });

    if (charges.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No charge found for this payment intent" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const charge = charges.data[0];

    // Create refund
    const refundParams: any = {
      charge: charge.id,
    };

    if (amountCents) {
      refundParams.amount = amountCents;
    }

    const refund = await stripe.refunds.create(refundParams);

    // Update ledger
    const refundAmount = refund.amount;
    const journalId = crypto.randomUUID();

    // Get user's available account
    const { data: availableAccount } = await supabase
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("user_id", user.id)
      .eq("kind", "available")
      .eq("currency", "USD")
      .single();

    if (availableAccount) {
      // Create refund entry
      await supabase.from("ledger_entries").insert({
        journal_id: journalId,
        account_id: availableAccount.id,
        amount_cents: -refundAmount,
        ref_type: "REFUND",
        ref_id: refund.id,
        metadata: { 
          payment_intent_id: paymentIntentId,
          refund_id: refund.id,
        },
      });

      // Update balance
      await supabase
        .from("ledger_accounts")
        .update({ balance_cents: availableAccount.balance_cents - refundAmount })
        .eq("id", availableAccount.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        amountCents: refundAmount,
        status: refund.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Refund error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});