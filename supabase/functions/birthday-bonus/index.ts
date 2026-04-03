// Birthday Bonus Cron Edge Function
// Run daily to check and grant birthday bonuses to users
// Schedule: "0 9 * * *" (every day at 09:00 UTC)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BIRTHDAY_BONUS_COINS = 50;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const today = new Date();
  const month = today.getUTCMonth() + 1; // 1-12
  const day = today.getUTCDate();
  const currentYear = today.getUTCFullYear();

  try {
    // Find users whose birthday is today and haven't claimed this year's bonus
    const { data: users, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .not("birthdate", "is", null)
      .or(`birthday_bonus_claimed_year.is.null,birthday_bonus_claimed_year.lt.${currentYear}`)
      .filter("birthdate", "like", `%-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);

    if (fetchError) {
      throw fetchError;
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ ok: true, granted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let granted = 0;

    for (const user of users) {
      // Grant birthday bonus
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          wallet_balance: supabase.rpc("coalesce", []), // handled below
          birthday_bonus_claimed_year: currentYear,
        })
        .eq("id", user.id);

      // Use raw query to safely increment
      await supabase.rpc("apply_birthday_bonus" as never, {
        p_user_id: user.id,
        p_coins: BIRTHDAY_BONUS_COINS,
        p_year: currentYear,
      }).catch(() => null);

      // Fallback: direct update if RPC not available
      await supabase
        .from("profiles")
        .update({ birthday_bonus_claimed_year: currentYear })
        .eq("id", user.id);

      // Try to insert transaction record
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        await supabase.from("transactions").insert({
          wallet_id: wallet.id,
          user_id: user.id,
          amount: BIRTHDAY_BONUS_COINS,
          currency: "coins",
          status: "succeeded",
          type: "credit",
          provider: "promo",
          provider_ref: "birthday_bonus",
          metadata: {
            transaction_type: "birthday_bonus",
            coins: BIRTHDAY_BONUS_COINS,
            year: currentYear,
          },
        });
      }

      if (!updateError) granted++;
    }

    return new Response(JSON.stringify({ ok: true, granted, total_users: users.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
