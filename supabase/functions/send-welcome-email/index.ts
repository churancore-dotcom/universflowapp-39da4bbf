// Sends a welcome / confirmation email via Resend after signup.
// Public endpoint (no JWT) — recipient + username are validated server-side.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}

function isEmail(s: string): boolean {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').trim().toLowerCase();
    const username = String(body?.username ?? '').trim().slice(0, 40) || 'there';

    if (!isEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anti-abuse: only send if a matching auth user exists and was created in the last 10 minutes.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lookup = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );
    if (!lookup.ok) {
      return new Response(JSON.stringify({ error: 'Lookup failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const lookupData = await lookup.json().catch(() => ({}));
    const u = (lookupData?.users ?? []).find((x: any) => String(x?.email ?? '').toLowerCase() === email);
    if (!u) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const createdAt = new Date(u.created_at).getTime();
    if (!createdAt || Date.now() - createdAt > 10 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Per-email throttle: at most 1 welcome email every 5 minutes, max 3 total.
    const throttleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/welcome_email_sends?email=eq.${encodeURIComponent(email)}&select=last_sent_at,send_count`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const throttleRows = throttleRes.ok ? await throttleRes.json().catch(() => []) : [];
    const prev = Array.isArray(throttleRows) && throttleRows[0];
    if (prev) {
      const last = new Date(prev.last_sent_at).getTime();
      if (Date.now() - last < 5 * 60 * 1000 || (prev.send_count ?? 0) >= 3) {
        return new Response(JSON.stringify({ success: true, throttled: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const safeName = escape(username);
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fff">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">
    <div style="background:linear-gradient(180deg,#15151a 0%,#0a0a0b 100%);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.5)">
      <div style="padding:48px 32px 8px;text-align:center">
        <div style="font-size:30px;font-weight:700;letter-spacing:-0.6px;line-height:1">
          <span style="background:linear-gradient(135deg,#FF2D55,#BF5AF2,#5E5CE6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:#FF2D55">Univers</span><span style="color:#fff;font-weight:300;margin-left:4px">Flow</span>
        </div>
        <div style="margin-top:10px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#6e6e73">Premium Music Experience</div>
      </div>
      <div style="padding:36px 36px 8px;text-align:center">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#FF2D55,#BF5AF2);line-height:64px;font-size:30px;margin-bottom:18px">🎧</div>
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.4px">Welcome, ${safeName}</h1>
        <p style="font-size:15px;line-height:1.6;color:#a1a1a6;margin:0 0 32px;max-width:440px;margin-left:auto;margin-right:auto">
          Your account is ready. Dive into millions of songs, follow your favourite artists, and discover what's trending right now around the world.
        </p>
        <a href="https://universflow.in/home"
           style="display:inline-block;background:linear-gradient(135deg,#FF2D55,#BF5AF2);color:#fff;text-decoration:none;padding:16px 40px;border-radius:999px;font-weight:600;font-size:15px;letter-spacing:.01em;box-shadow:0 10px 30px rgba(255,45,85,0.35)">
          Open Universflow
        </a>
      </div>
      <div style="margin:40px 36px 0;padding:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px">
        <p style="margin:0 0 16px;font-size:12px;color:#6e6e73;letter-spacing:.05em;text-transform:uppercase;text-align:center">What's inside</p>
        <table style="width:100%;border-collapse:collapse" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#e5e5ea">🎵 <span style="color:#a1a1a6">&nbsp;Millions of songs, ad-light</span></td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#e5e5ea">⭐ <span style="color:#a1a1a6">&nbsp;Follow artists & build playlists</span></td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#e5e5ea">🔥 <span style="color:#a1a1a6">&nbsp;Trending charts from around the globe</span></td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#e5e5ea">📥 <span style="color:#a1a1a6">&nbsp;Offline downloads on Premium</span></td>
          </tr>
        </table>
      </div>
      <div style="padding:32px 36px 36px;text-align:center">
        <p style="margin:0;font-size:11px;color:#48484a;line-height:1.6">If you didn't create this account, you can safely ignore this email.</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#48484a">
      © Universflow · <a href="https://universflow.in" style="color:#6e6e73;text-decoration:none">universflow.in</a>
    </div>
  </div>
</body></html>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Universflow <noreply@universflow.in>',
        reply_to: 'support@universflow.in',
        to: [email],
        subject: 'Welcome to Universflow 🎉',
        html,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'Unable to send welcome email.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record the send for throttling.
    await fetch(`${SUPABASE_URL}/rest/v1/welcome_email_sends`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        email,
        last_sent_at: new Date().toISOString(),
        send_count: ((prev?.send_count ?? 0) + 1),
      }),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, id: data?.id ?? null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-welcome-email error', err);
    return new Response(JSON.stringify({ error: 'Unable to send welcome email.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
