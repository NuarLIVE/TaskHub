import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const hasSubscription = await supabase.rpc("has_active_recommendations_subscription", {
      p_user_id: user.id,
    });

    if (!hasSubscription.data) {
      return new Response(
        JSON.stringify({ error: "No active subscription" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: openOrders } = await supabase
      .from("orders")
      .select("id, title, description, budget, category_id, subcategory_id, created_at, user_id")
      .eq("status", "open")
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!openOrders || openOrders.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: userDeals } = await supabase
      .from("deals")
      .select("final_amount, created_at, updated_at")
      .eq("freelancer_id", user.id)
      .eq("status", "completed");

    const avgAmount = userDeals && userDeals.length > 0
      ? userDeals.reduce((sum, deal) => sum + (deal.final_amount || 0), 0) / userDeals.length
      : profile.hourly_rate || 0;

    const totalDeals = userDeals?.length || 0;
    const avgRating = profile.rating || 0;

    const avgCompletionTime = userDeals && userDeals.length > 0
      ? userDeals.reduce((sum, deal) => {
          const start = new Date(deal.created_at).getTime();
          const end = new Date(deal.updated_at).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / userDeals.length
      : 7;

    const recommendations = [];

    for (const order of openOrders) {
      let score = 0;
      const reasons = [];

      if (profile.skills && order.title) {
        const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
        const titleLower = order.title.toLowerCase();
        const descLower = (order.description || "").toLowerCase();
        
        const matchingSkills = skillsArray.filter((skill: string) =>
          titleLower.includes(skill.toLowerCase()) ||
          descLower.includes(skill.toLowerCase())
        );

        if (matchingSkills.length > 0) {
          score += 30;
          reasons.push({ type: "skills", value: `Совпадают навыки: ${matchingSkills.join(", ")}` });
        }
      }

      if (order.budget && avgAmount > 0) {
        const budgetDiff = Math.abs(order.budget - avgAmount) / avgAmount;
        if (budgetDiff < 0.3) {
          score += 25;
          reasons.push({ type: "budget", value: "Бюджет соответствует вашей средней сумме работы" });
        } else if (budgetDiff < 0.5) {
          score += 15;
          reasons.push({ type: "budget", value: "Бюджет близок к вашей средней сумме" });
        }
      }

      if (totalDeals > 5) {
        score += 15;
        reasons.push({ type: "experience", value: `У вас ${totalDeals} завершенных сделок` });
      } else if (totalDeals > 2) {
        score += 10;
      }

      if (avgRating >= 4.5) {
        score += 15;
        reasons.push({ type: "rating", value: `Высокий рейтинг ${avgRating.toFixed(1)}` });
      } else if (avgRating >= 4.0) {
        score += 10;
      }

      if (order.category_id && profile.category) {
        const { data: orderCategory } = await supabase
          .from("categories")
          .select("name")
          .eq("id", order.category_id)
          .single();

        if (orderCategory && orderCategory.name === profile.category) {
          score += 20;
          reasons.push({ type: "category", value: "Ваша основная специализация" });
        }
      }

      if (score >= 40) {
        recommendations.push({
          user_id: user.id,
          order_id: order.id,
          match_score: Math.min(100, score),
          match_reasons: reasons,
          is_visible: true,
        });
      }
    }

    recommendations.sort((a, b) => b.match_score - a.match_score);
    const topRecommendations = recommendations.slice(0, 20);

    await supabase
      .from("order_recommendations")
      .delete()
      .eq("user_id", user.id);

    if (topRecommendations.length > 0) {
      await supabase
        .from("order_recommendations")
        .insert(topRecommendations);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: topRecommendations.length,
        recommendations: topRecommendations,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
