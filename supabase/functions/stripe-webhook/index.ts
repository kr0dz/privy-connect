import Stripe from "npm:stripe@14.21.0";
import { Expo } from "npm:expo-server-sdk@4.0.0";
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

interface PushTokenRow {
  token: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

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
    const checkoutType = String(metadata.checkout_type || 'content').trim();
    const creatorId = String(metadata.creatorId || "").trim();
    const userId = String(metadata.userId || "").trim();
    const messageId = String(metadata.messageId || "").trim();
    const currency = String(session.currency || "usd").toLowerCase();
    const amount = Number(session.amount_total || 0) / 100;

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (checkoutType === 'coins') {
      const coins = Number(metadata.coins || 0);
      if (userId && Number.isFinite(coins) && coins > 0) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .maybeSingle();

        const nextBalance = Number(userProfile?.wallet_balance || 0) + coins;
        const { error: coinsError } = await supabase
          .from('profiles')
          .update({ wallet_balance: nextBalance })
          .eq('id', userId);

        if (coinsError) {
          console.error('Error updating coin balance:', coinsError);
        }

        const { data: walletData } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        let walletId = walletData?.id as string | undefined;
        if (!walletId) {
          const { data: createdWallet } = await supabase
            .from('wallets')
            .insert({ user_id: userId, currency: 'coins', balance: 0 })
            .select('id')
            .single();
          walletId = createdWallet?.id as string | undefined;
        }

        if (walletId) {
          await supabase.from('transactions').insert({
            wallet_id: walletId,
            user_id: userId,
            amount: coins,
            currency: 'coins',
            status: 'succeeded',
            type: 'credit',
            provider: 'stripe',
            provider_ref: session.id,
            metadata: {
              transaction_type: 'purchase',
              checkout_type: 'coins',
              usd_amount: Number(session.amount_total || 0) / 100,
              coins,
            },
          });
        }

        await supabase.from('analytics_events').insert({
          user_id: userId,
          creator_id: null,
          event_type: 'coin_purchase',
          metadata: {
            stripe_session_id: session.id,
            coins,
            usd_amount: Number(session.amount_total || 0) / 100,
          },
        });
      }

      return new Response(JSON.stringify({ received: true, type: 'coins' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messageId) {
      await supabase
        .from("messages")
        .update({ paid: true, requires_payment: false, read: false })
        .eq("id", messageId);
    }

    await supabase.from('analytics_events').insert({
      user_id: userId || null,
      creator_id: creatorId || null,
      event_type: 'payment',
      metadata: {
        stripe_session_id: session.id,
        message_id: messageId || null,
        amount,
        currency,
      },
    });

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
            content_type: metadata.contentType || metadata.content_type || 'chat_unlock',
          },
        });

        if (transactionError) {
          console.error("Error inserting transaction:", transactionError);
        }
      }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', creatorId);

      const expo = new Expo(expoAccessToken ? { accessToken: expoAccessToken } : undefined);
      const validTokens = ((tokens || []) as PushTokenRow[])
        .map(row => row.token)
        .filter(token => Expo.isExpoPushToken(token));

      if (validTokens.length > 0) {
        const chunks = expo.chunkPushNotifications(
          validTokens.map(token => ({
            to: token,
            sound: 'default',
            title: 'New Purchase',
            body: `A fan bought content for $${amount.toFixed(2)}`,
            data: { scope: 'creator_dashboard', amount, currency },
          }))
        );

        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (pushError) {
            console.error('Error sending push notification chunk:', pushError);
          }
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
