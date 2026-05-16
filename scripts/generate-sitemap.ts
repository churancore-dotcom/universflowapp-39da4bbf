// Generates public/sitemap.xml for the indexable Universflow routes.
// Public discovery routes are listed statically; public playlist/artist URLs are read from Lovable Cloud when available.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://universflow.in";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/home", changefreq: "daily", priority: "0.95" },
  { path: "/search", changefreq: "daily", priority: "0.9" },
  { path: "/artists", changefreq: "weekly", priority: "0.85" },
  { path: "/premium", changefreq: "monthly", priority: "0.8" },
  { path: "/support", changefreq: "monthly", priority: "0.65" },
  { path: "/auth", changefreq: "monthly", priority: "0.6" },
];

const toDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : undefined;

async function loadDynamicEntries(): Promise<SitemapEntry[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [artistsRes, playlistsRes, sharedPlaylistsRes] = await Promise.all([
    supabase.from("artists").select("id, updated_at").order("updated_at", { ascending: false }).limit(5000),
    supabase.from("playlists").select("id, updated_at").eq("is_public", true).order("updated_at", { ascending: false }).limit(5000),
    supabase.from("playlists").select("share_token, updated_at").not("share_token", "is", null).order("updated_at", { ascending: false }).limit(5000),
  ]);

  const entries: SitemapEntry[] = [];

  if (artistsRes.data) {
    entries.push(...artistsRes.data.map((artist: any) => ({
      path: `/artist/${artist.id}`,
      lastmod: toDate(artist.updated_at),
      changefreq: "weekly" as const,
      priority: "0.7",
    })));
  }

  if (playlistsRes.data) {
    entries.push(...playlistsRes.data.map((playlist: any) => ({
      path: `/playlist/${playlist.id}`,
      lastmod: toDate(playlist.updated_at),
      changefreq: "weekly" as const,
      priority: "0.65",
    })));
  }

  if (sharedPlaylistsRes.data) {
    entries.push(...sharedPlaylistsRes.data.map((playlist: any) => ({
      path: `/p/${playlist.share_token}`,
      lastmod: toDate(playlist.updated_at),
      changefreq: "weekly" as const,
      priority: "0.6",
    })));
  }

  return entries;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function generateSitemap(entries: SitemapEntry[]) {
  const seen = new Set<string>();
  const urls = entries
    .filter((entry) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    })
    .map((entry) => [
      "  <url>",
      `    <loc>${escapeXml(`${BASE_URL}${entry.path}`)}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n"));

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

try {
  const dynamicEntries = await loadDynamicEntries();
  const entries = [...staticEntries, ...dynamicEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
} catch (error) {
  console.warn("Dynamic sitemap entries failed; writing static sitemap only.", error);
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(staticEntries));
  console.log(`sitemap.xml written (${staticEntries.length} static entries)`);
}
