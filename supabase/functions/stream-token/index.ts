import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { StreamClient } from "npm:@stream-io/node-sdk@0.14.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoCallAuthRow {
  creator_id: string;
  fan_id: string | null;
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
    const requestedUserId = String(body?.userId || "").trim();
    const callId = String(body?.callId || "").trim();

    if (!requestedUserId || !callId) {
      return new Response(JSON.stringify({ error: "userId and callId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestedUserId !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Invalid user context" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callData, error: callError } = await serviceClient
      .from("video_calls")
      .select("creator_id, fan_id")
      .eq("stream_call_id", callId)
      .maybeSingle();

    if (callError || !callData) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callRow = callData as VideoCallAuthRow;
    if (requestedUserId !== callRow.creator_id && requestedUserId !== callRow.fan_id) {
      return new Response(JSON.stringify({ error: "Not authorized for this call" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const streamClient = new StreamClient(streamApiKey, streamSecret);
    const token = streamClient.generateUserToken({ user_id: requestedUserId });

    return new Response(JSON.stringify({ token }), {
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
