import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLATFORM_FEE_PERCENT = 10; // 10% platform fee

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

    const { dealId } = await req.json();

    if (!dealId) {
      return new Response(
        JSON.stringify({ error: "dealId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get deal details
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select(`
        *,
        buyer:buyer_id (id, stripe_account_id),
        seller:seller_id (id, stripe_account_id, stripe_payouts_enabled)
      `)
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      return new Response(
        JSON.stringify({ error: "Deal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is buyer
    if (deal.buyer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only buyer can release funds" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check deal status
    if (deal.status !== "in_progress") {
      return new Response(
        JSON.stringify({ error: "Deal must be in_progress to release funds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountCents = deal.amount_cents;
    const platformFeeCents = Math.floor(amountCents * PLATFORM_FEE_PERCENT / 100);
    const sellerAmountCents = amountCents - platformFeeCents;

    const journalId = crypto.randomUUID();

    // Get buyer escrow account
    const { data: buyerEscrow } = await supabase
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("user_id", deal.buyer_id)
      .eq("kind", "escrow")
      .eq("currency", "USD")
      .single();

    if (!buyerEscrow || buyerEscrow.balance_cents < amountCents) {
      return new Response(
        JSON.stringify({ error: "Insufficient escrow balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create seller available account
    let { data: sellerAvailable } = await supabase
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("user_id", deal.seller_id)
      .eq("kind", "available")
      .eq("currency", "USD")
      .maybeSingle();

    if (!sellerAvailable) {
      const { data: newAccount } = await supabase
        .from("ledger_accounts")
        .insert({ user_id: deal.seller_id, kind: "available", currency: "USD", balance_cents: 0 })
        .select("id, balance_cents")
        .single();
      sellerAvailable = newAccount;
    }

    // Get or create platform revenue account
    let { data: platformAccount } = await supabase
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("kind", "platform_revenue")
      .eq("currency", "USD")
      .maybeSingle();

    if (!platformAccount) {
      const { data: newAccount } = await supabase
        .from("ledger_accounts")
        .insert({ 
          user_id: user.id, // Use any user for platform account
          kind: "platform_revenue", 
          currency: "USD", 
          balance_cents: 0 
        })
        .select("id, balance_cents")
        .single();
      platformAccount = newAccount;
    }

    // Create ledger entries
    await supabase.from("ledger_entries").insert([
      {
        journal_id: journalId,
        account_id: buyerEscrow.id,
        amount_cents: -amountCents,
        ref_type: "RELEASE",
        ref_id: dealId,
        metadata: { deal_id: dealId, type: "escrow_release" },
      },
      {
        journal_id: journalId,
        account_id: sellerAvailable.id,
        amount_cents: sellerAmountCents,
        ref_type: "RELEASE",
        ref_id: dealId,
        metadata: { deal_id: dealId, type: "seller_payment" },
      },
      {
        journal_id: journalId,
        account_id: platformAccount.id,
        amount_cents: platformFeeCents,
        ref_type: "FEE",
        ref_id: dealId,
        metadata: { deal_id: dealId, type: "platform_fee" },
      },
    ]);

    // Update balances
    await supabase
      .from("ledger_accounts")
      .update({ balance_cents: buyerEscrow.balance_cents - amountCents })
      .eq("id", buyerEscrow.id);

    await supabase
      .from("ledger_accounts")
      .update({ balance_cents: sellerAvailable.balance_cents + sellerAmountCents })
      .eq("id", sellerAvailable.id);

    await supabase
      .from("ledger_accounts")
      .update({ balance_cents: platformAccount.balance_cents + platformFeeCents })
      .eq("id", platformAccount.id);

    // Update deal status
    await supabase
      .from("deals")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", dealId);

    // If seller has Stripe Connect, create transfer
    let transferId = null;
    if (deal.seller?.stripe_account_id && deal.seller?.stripe_payouts_enabled) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2024-12-18.acacia",
      });

      try {
        const transfer = await stripe.transfers.create({
          amount: sellerAmountCents,
          currency: "usd",
          destination: deal.seller.stripe_account_id,
          description: `Payment for deal ${dealId}`,
          metadata: {
            deal_id: dealId,
            seller_id: deal.seller_id,
          },
        });
        transferId = transfer.id;
        console.log(`Created Stripe transfer ${transferId} for ${sellerAmountCents} cents`);
      } catch (stripeError) {
        console.error("Stripe transfer error:", stripeError);
        // Continue anyway - funds are in internal ledger
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dealId,
        amountCents,
        sellerAmountCents,
        platformFeeCents,
        transferId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Deal release error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});