import Stripe from "npm:stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Missing webhook environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing Stripe signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.text();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true, ignored: event.type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const creatorId = String(metadata.creatorId || "").trim();
    const userId = String(metadata.userId || "").trim();
    const messageId = String(metadata.messageId || "").trim();
    const currency = String(session.currency || "usd").toLowerCase();
    const amount = Number(session.amount_total || 0) / 100;

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (messageId) {
      await supabase
        .from("messages")
        .update({ paid: true, requires_payment: false, read: false })
        .eq("id", messageId);
    }

    if (creatorId) {
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("id, user_id, balance, currency")
        .eq("user_id", creatorId)
        .maybeSingle();

      let wallet: WalletRow | null = walletData as WalletRow | null;

      if (walletError) {
        console.error("Error loading wallet:", walletError);
      }

      if (!wallet) {
        const { data: createdWallet, error: createWalletError } = await supabase
          .from("wallets")
          .insert({
            user_id: creatorId,
            currency,
            balance: amount,
          })
          .select("id, user_id, balance, currency")
          .single();

        if (createWalletError) {
          console.error("Error creating wallet:", createWalletError);
        }

        wallet = (createdWallet as WalletRow | null) ?? null;
      } else {
        const nextBalance = Number(wallet.balance || 0) + amount;
        const { error: updateWalletError } = await supabase
          .from("wallets")
          .update({ balance: nextBalance, currency })
          .eq("id", wallet.id);

        if (updateWalletError) {
          console.error("Error updating wallet:", updateWalletError);
        }
      }

      if (wallet?.id) {
        const { error: transactionError } = await supabase.from("transactions").insert({
          wallet_id: wallet.id,
          user_id: creatorId,
          amount,
          currency,
          status: "succeeded",
          type: "credit",
          provider: "stripe",
          provider_ref: String(session.payment_intent || session.id),
          metadata: {
            stripe_session_id: session.id,
            fan_user_id: userId,
            message_id: messageId || null,
          },
        });

        if (transactionError) {
          console.error("Error inserting transaction:", transactionError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
