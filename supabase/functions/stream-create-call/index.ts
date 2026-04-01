import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { StreamClient } from "npm:@stream-io/node-sdk@0.14.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushTokenRow {
  token: string;
}

interface VideoCallRow {
  id: string;
  creator_id: string;
  fan_id: string | null;
  start_time: string;
  status: string;
  stream_call_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const streamApiKey = Deno.env.get("VITE_STREAM_API_KEY");
    const streamSecret = Deno.env.get("STREAM_SECRET_KEY");
    const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

    if (!supabaseUrl || !serviceRole || !anonKey || !streamApiKey || !streamSecret) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const slotId = String(body?.slotId || "").trim();

    if (!slotId) {
      return new Response(JSON.stringify({ error: "slotId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: slotData, error: slotError } = await serviceClient
      .from("video_calls")
      .select("id, creator_id, fan_id, start_time, status, stream_call_id")
      .eq("id", slotId)
      .maybeSingle();

    if (slotError || !slotData) {
      return new Response(JSON.stringify({ error: "Slot not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slot = slotData as VideoCallRow;
    const callerId = authData.user.id;

    if (callerId !== slot.creator_id && callerId !== slot.fan_id) {
      return new Response(JSON.stringify({ error: "Not authorized for this call" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (slot.status !== "booked") {
      return new Response(JSON.stringify({ error: "Call room can be created only for booked slots" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (slot.stream_call_id) {
      return new Response(JSON.stringify({ callId: slot.stream_call_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const streamClient = new StreamClient(streamApiKey, streamSecret);
    const callId = `slot-${slot.id}`;
    const call = streamClient.video.call("default", callId);

    await call.create({
      data: {
        created_by_id: slot.creator_id,
        starts_at: slot.start_time,
        custom: {
          slot_id: slot.id,
          creator_id: slot.creator_id,
          fan_id: slot.fan_id,
        },
      },
    });

    const { error: updateError } = await serviceClient
      .from("video_calls")
      .update({ stream_call_id: callId })
      .eq("id", slot.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = [slot.creator_id, slot.fan_id].filter((value): value is string => Boolean(value));

    for (const recipientId of recipients) {
      const { data: tokens } = await serviceClient
        .from("push_tokens")
        .select("token")
        .eq("user_id", recipientId);

      const messages = ((tokens || []) as PushTokenRow[])
        .map((row) => row.token)
        .filter((token) => token.startsWith("ExpoPushToken"))
        .map((token) => ({
          to: token,
          title: "Video call scheduled",
          body: "Your video call has been scheduled. Join from your dashboard.",
          sound: "default",
          data: { type: "video_call", callId },
        }));

      if (messages.length > 0) {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
          },
          body: JSON.stringify(messages),
        });
      }
    }

    return new Response(JSON.stringify({ callId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
