import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutPayload {
  userId: string;
  creatorId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
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

    const body = (await req.json()) as CheckoutPayload;
    const userId = String(body.userId || "").trim();
    const creatorId = String(body.creatorId || "").trim();
    const amount = Number(body.amount);
    const currency = (body.currency || "usd").toLowerCase();

    if (!userId || !creatorId || !Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const metadata: Record<string, string> = {
      userId,
      creatorId,
      ...(body.metadata || {}),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: body.successUrl || `${origin}/discover?stripe_success=1&message_id=${encodeURIComponent(metadata.messageId || "")}`,
      cancel_url: body.cancelUrl || `${origin}/discover?stripe_canceled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: "PrivyLoop Unlock",
              description: metadata.description || "Contenido premium del creador",
            },
          },
        },
      ],
      metadata,
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
