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

    const { amountMinor, currency = "usd" } = await req.json();

    if (!amountMinor || amountMinor < 50) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 50 cents ($0.50)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WALLET-DEPOSIT] user=${user.id} amount=${amountMinor}`);

    // Create pending deposit record in wallet_ledger
    const { data: deposit, error: depositError } = await supabase
      .from("wallet_ledger")
      .insert({
        user_id: user.id,
        kind: "deposit",
        status: "pending",
        amount_minor: amountMinor,
        currency: currency.toLowerCase(),
        metadata: { origin: "wallet_topup" },
      })
      .select()
      .single();

    if (depositError || !deposit) {
      console.error("[WALLET-DEPOSIT] Failed to create deposit record:", depositError);
      return new Response(
        JSON.stringify({ error: "Failed to create deposit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WALLET-DEPOSIT] Created deposit record: ${deposit.id}`);

    // Create Stripe PaymentIntent
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: currency.toLowerCase(),
      confirm: false,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        deposit_id: deposit.id,
        origin: "wallet_topup",
      },
    });

    console.log(`[WALLET-DEPOSIT] Created PaymentIntent: ${paymentIntent.id}`);

    // Update deposit record with stripe_pi_id
    const { error: updateError } = await supabase
      .from("wallet_ledger")
      .update({ stripe_pi_id: paymentIntent.id })
      .eq("id", deposit.id);

    if (updateError) {
      console.error("[WALLET-DEPOSIT] Failed to update stripe_pi_id:", updateError);
      // Continue anyway - webhook will handle it
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        depositId: deposit.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[WALLET-DEPOSIT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
