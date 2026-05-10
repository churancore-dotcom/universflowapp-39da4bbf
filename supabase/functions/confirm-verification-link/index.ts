// Confirms an email verification link.
// Public endpoint — anyone with a valid token can verify (the token IS the auth).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? '').trim();
    if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid link' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenHash = await sha256(token);

    // Find row by hash
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/email_verifications?code_hash=eq.${tokenHash}&select=user_id,email,expires_at`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );
    const rows = await findRes.json().catch(() => []);
    const row = rows?.[0];
    if (!row) {
      return new Response(JSON.stringify({ error: 'This link is invalid or has already been used' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'This link has expired. Request a new one.' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark profile verified
    const upd = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${row.user_id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        }),
      }
    );
    if (!upd.ok) {
      const t = await upd.text();
      console.error('profile update failed', upd.status, t);
      return new Response(JSON.stringify({ error: 'Could not verify your email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Burn the token
    await fetch(
      `${SUPABASE_URL}/rest/v1/email_verifications?user_id=eq.${row.user_id}`,
      {
        method: 'DELETE',
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          Prefer: 'return=minimal',
        },
      }
    );

    return new Response(JSON.stringify({ success: true, email: row.email }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('confirm-verification-link error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
