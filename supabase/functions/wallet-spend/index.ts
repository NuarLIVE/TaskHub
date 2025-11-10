import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    const { amountCents, refType, refId, metadata = {} } = await req.json();

    if (!amountCents || amountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be positive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!refType || !refId) {
      return new Response(
        JSON.stringify({ error: "refType and refId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's available account
    const { data: availableAccount, error: accountError } = await supabase
      .from("ledger_accounts")
      .select("id, balance_cents")
      .eq("user_id", user.id)
      .eq("kind", "available")
      .eq("currency", "USD")
      .maybeSingle();

    if (accountError || !availableAccount) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check balance
    if (availableAccount.balance_cents < amountCents) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient balance",
          available: availableAccount.balance_cents,
          required: amountCents,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const journalId = crypto.randomUUID();

    // Create spend entry
    const { error: entryError } = await supabase.from("ledger_entries").insert({
      journal_id: journalId,
      account_id: availableAccount.id,
      amount_cents: -amountCents,
      ref_type: refType,
      ref_id: refId,
      metadata: metadata,
    });

    if (entryError) {
      console.error("Ledger entry error:", entryError);
      return new Response(
        JSON.stringify({ error: "Failed to create ledger entry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update balance
    const { error: updateError } = await supabase
      .from("ledger_accounts")
      .update({ balance_cents: availableAccount.balance_cents - amountCents })
      .eq("id", availableAccount.id);

    if (updateError) {
      console.error("Balance update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        journalId,
        amountCents,
        newBalance: availableAccount.balance_cents - amountCents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Spend error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});