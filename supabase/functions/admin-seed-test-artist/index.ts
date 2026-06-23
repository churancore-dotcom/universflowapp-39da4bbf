// One-shot admin helper to seed a test artist account.
// This function exists only for the build agent to bootstrap a QA artist; it
// is deleted immediately after use. While alive, it has no public surface
// because the caller must pass a hard-coded marker and an email that matches.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_EMAIL = 'testartist@universflow.com';
const MARKER = 'universflow-seed-test-artist-2026';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, password, stage_name, marker } = await req.json();
    if (marker !== MARKER || email !== ALLOWED_EMAIL) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username: stage_name },
    });
    if (createErr && !/already|registered|exists/i.test(createErr.message)) throw createErr;
    if (created?.user) {
      userId = created.user.id;
    } else {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
      if (!userId) throw new Error('User exists but could not be located');
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    }

    await admin.from('profiles').update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      username: stage_name,
    }).eq('user_id', userId);

    await admin.from('user_roles').upsert(
      { user_id: userId, role: 'artist' as const },
      { onConflict: 'user_id,role' },
    );

    // Slug
    const baseSlug = (stage_name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist';
    let slug = baseSlug;
    const { data: mine } = await admin.from('artist_profiles').select('slug').eq('user_id', userId).maybeSingle();
    if (mine?.slug) {
      slug = mine.slug;
    } else {
      for (let i = 1; i < 50; i++) {
        const { data: clash } = await admin.from('artist_profiles').select('id').eq('slug', slug).maybeSingle();
        if (!clash) break;
        slug = `${baseSlug}-${i}`;
      }
    }

    await admin.from('artist_profiles').upsert(
      {
        user_id: userId,
        stage_name,
        slug,
        bio: 'Test artist account for QA — feel free to upload demo tracks.',
        is_verified: true,
        country_code: 'IN',
        social_links: {},
      },
      { onConflict: 'user_id' },
    );

    return new Response(JSON.stringify({ ok: true, user_id: userId, slug }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
