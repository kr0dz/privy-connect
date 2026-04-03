import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported coin packs with fixed pricing
const COIN_PACKS: Record<number, number> = {
  100: 5,
  250: 12,
  500: 22,
};

// Fallback: dynamic rate for arbitrary amounts
const COINS_PER_DOLLAR = 20;

interface BuyCoinsPayload {
  userId: string;
  coins: number;
  price_usd?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BuyCoinsPayload;
    const userId = String(body.userId || "").trim();
    const coins = Number(body.coins || 0);

    if (!userId || !Number.isFinite(coins) || coins <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine USD amount: use fixed pack if available, otherwise dynamic
    let amountUsd: number;
    if (body.price_usd && Number.isFinite(body.price_usd) && body.price_usd > 0) {
      amountUsd = body.price_usd;
    } else if (COIN_PACKS[coins] !== undefined) {
      amountUsd = COIN_PACKS[coins];
    } else {
      amountUsd = Math.max(1, Math.ceil(coins / COINS_PER_DOLLAR));
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/dashboard/fan?coins_success=1`,
      cancel_url: `${origin}/dashboard/fan?coins_canceled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountUsd * 100),
            product_data: {
              name: `${coins} PrivyCoins`,
              description: `Top-up de monedas virtuales para mensajeria premium`,
            },
          },
        },
      ],
      metadata: {
        checkout_type: "coins",
        userId,
        coins: String(coins),
        usd_amount: String(amountUsd),
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      status: 200,
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
