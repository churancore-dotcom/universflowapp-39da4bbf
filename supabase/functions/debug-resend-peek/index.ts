// TEMP diagnostic — fetches the most recent Resend email so we can see what link the user actually got.
const RESEND = Deno.env.get('RESEND_API_KEY')!;
Deno.serve(async () => {
  const list = await fetch('https://api.resend.com/emails?limit=3', {
    headers: { Authorization: `Bearer ${RESEND}` },
  });
  const j = await list.json();
  const ids = (j?.data ?? []).map((e: any) => e.id);
  const out: any[] = [];
  for (const id of ids) {
    const r = await fetch(`https://api.resend.com/emails/${id}`, {
      headers: { Authorization: `Bearer ${RESEND}` },
    });
    const d = await r.json();
    // Pull the href from the HTML
    const m = String(d?.html ?? '').match(/href="([^"]*verify[^"]*)"/i);
    out.push({ id, to: d?.to, subject: d?.subject, last_event: d?.last_event, link: m?.[1] ?? null });
  }
  return new Response(JSON.stringify({ recent: out }, null, 2), { headers: { 'Content-Type': 'application/json' } });
});
