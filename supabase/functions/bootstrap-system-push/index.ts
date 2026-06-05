// Admin-only: rotate the dedicated system push token stored in internal_secrets.
// Never writes the Supabase service role key to the database.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ud } = await userClient.auth.getUser();
    const uid = ud?.user?.id;
    if (!uid) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: role } = await admin.from("user_roles")
      .select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Defensive: ensure the service role key is never persisted in DB.
    await admin.from("internal_secrets").delete().eq("key", "service_role_key");

    const token = randomToken();
    const { error } = await admin.from("internal_secrets").upsert({
      key: "system_push_token",
      value: token,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: "System push token rotated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bootstrap-system-push error", e);
    return new Response(JSON.stringify({ error: "Bootstrap failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
