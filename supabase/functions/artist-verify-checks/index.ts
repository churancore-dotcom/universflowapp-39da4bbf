// Runs automated verification checks on a freshly-submitted artist application:
// 1) Face similarity: selfie-with-ID vs liveness "center" shot (Gemini Vision).
// 2) OCR on ID front: extract printed name (Gemini Vision) and compare to typed legal name.
// 3) Updates artist_applications with scores and admin-visible warnings.
//
// Cost: $0 — uses Lovable AI Gateway (Gemini Flash Lite) which is included.
// No external server, no DB cost beyond Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const KYC_BUCKET = "artist-kyc";
const MODEL = "google/gemini-2.5-flash-lite";

// --- small helpers ---
function normName(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s: string): string[] { return normName(s).split(" ").filter(Boolean); }
function nameSimilarity(a: string, b: string): number {
  const A = new Set(tokens(a)); const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.max(A.size, B.size);
}
async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  const b64 = btoa(s);
  return `data:${blob.type || "image/jpeg"};base64,${b64}`;
}

async function callGemini(messages: any[]): Promise<string> {
  const r = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0 }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Gemini ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}
function parseJsonish(s: string): any {
  try {
    const m = s.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : s);
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { application_id } = await req.json().catch(() => ({}));
    if (!application_id || typeof application_id !== "string") {
      return new Response(JSON.stringify({ error: "application_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: app, error: appErr } = await admin
      .from("artist_applications")
      .select("id, user_id, real_name, id_doc_front_path, selfie_path, social_links")
      .eq("id", application_id)
      .maybeSingle();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (app.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const warnings: string[] = [];
    let faceScore: number | null = null;
    let faceStatus: "pass" | "fail" | "review" | "error" = "review";
    let ocrName: string | null = null;
    let nameScore: number | null = null;

    // Fetch image bytes from private bucket using service role.
    async function dl(path: string | null): Promise<Blob | null> {
      if (!path) return null;
      const { data, error } = await admin.storage.from(KYC_BUCKET).download(path);
      if (error || !data) return null;
      return data;
    }

    const faceShots: string[] = Array.isArray((app.social_links as any)?.face_shots)
      ? (app.social_links as any).face_shots
      : [];
    const centerShotPath = faceShots[0] || null; // first uploaded = center

    const [selfieBlob, centerBlob, frontBlob] = await Promise.all([
      dl(app.selfie_path),
      dl(centerShotPath),
      dl(app.id_doc_front_path),
    ]);

    // --- 1) Face match: selfie-with-ID vs liveness center shot ---
    try {
      if (selfieBlob && centerBlob) {
        const [a, b] = await Promise.all([blobToDataUrl(selfieBlob), blobToDataUrl(centerBlob)]);
        const out = await callGemini([
          {
            role: "system",
            content:
              "You are a strict face-verification reviewer. Compare two photos and decide whether the SAME real person appears in both. Ignore background, lighting, expression, glasses. If either photo has no clear human face, set match=false and confidence=0. Reply ONLY with compact JSON: {\"match\":boolean,\"confidence\":number_between_0_and_1,\"reason\":\"short\"}.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Photo A (selfie holding ID):" },
              { type: "image_url", image_url: { url: a } },
              { type: "text", text: "Photo B (liveness front-facing camera shot):" },
              { type: "image_url", image_url: { url: b } },
            ],
          },
        ]);
        const parsed = parseJsonish(out);
        if (parsed && typeof parsed.confidence === "number") {
          faceScore = Math.max(0, Math.min(1, parsed.confidence));
          faceStatus = parsed.match && faceScore >= 0.7 ? "pass"
            : !parsed.match && faceScore <= 0.3 ? "fail"
            : "review";
          if (faceStatus === "fail") warnings.push("⚠️ Face mismatch: selfie person ≠ liveness person.");
          else if (faceStatus === "review") warnings.push("⚠️ Face match uncertain — please review manually.");
        } else {
          faceStatus = "error";
          warnings.push("⚠️ Face check could not run — please review manually.");
        }
      } else {
        faceStatus = "error";
        warnings.push("⚠️ Face check skipped — missing selfie or liveness image.");
      }
    } catch (e) {
      console.error("face check error", e);
      faceStatus = "error";
      warnings.push("⚠️ Face check failed to run — please review manually.");
    }

    // --- 2) OCR on ID front, compare to typed legal name ---
    try {
      if (frontBlob) {
        const url = await blobToDataUrl(frontBlob);
        const out = await callGemini([
          {
            role: "system",
            content:
              "You extract the printed full name of the document holder from a photo of a government ID. Reply ONLY with compact JSON: {\"name\":\"FULL NAME AS PRINTED OR null IF UNREADABLE\",\"document_type\":\"short\",\"readable\":boolean}.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the holder's printed full name from this ID document." },
              { type: "image_url", image_url: { url } },
            ],
          },
        ]);
        const parsed = parseJsonish(out);
        if (parsed && parsed.name && typeof parsed.name === "string") {
          ocrName = parsed.name.trim().slice(0, 120);
          nameScore = nameSimilarity(ocrName, app.real_name || "");
          if (nameScore < 0.4) {
            warnings.push(`⚠️ Name mismatch: ID says "${ocrName}", applicant typed "${app.real_name}".`);
          } else if (nameScore < 0.7) {
            warnings.push(`ℹ️ Partial name match (${Math.round(nameScore * 100)}%): ID "${ocrName}" vs typed "${app.real_name}".`);
          }
        } else {
          warnings.push("⚠️ ID name could not be read — please review front-of-ID image.");
        }
      } else {
        warnings.push("⚠️ ID front missing — cannot extract name.");
      }
    } catch (e) {
      console.error("ocr error", e);
      warnings.push("⚠️ OCR failed to run — please review ID manually.");
    }

    // --- Persist results ---
    const { error: updErr } = await admin
      .from("artist_applications")
      .update({
        face_match_score: faceScore,
        face_match_status: faceStatus,
        ocr_extracted_name: ocrName,
        name_match_score: nameScore,
        auto_check_warnings: warnings,
        auto_checks_at: new Date().toISOString(),
      })
      .eq("id", application_id);

    if (updErr) {
      console.error("update error", updErr);
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        face_match_score: faceScore,
        face_match_status: faceStatus,
        ocr_extracted_name: ocrName,
        name_match_score: nameScore,
        warnings,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("artist-verify-checks fatal", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
