import type { ChildSummary, StoryPage } from "../types";

/**
 * Base URL of the Cloudflare Worker API.
 * - Dev: unset -> /api is proxied by Vite to wrangler dev on :8787.
 * - Prod: set VITE_API_BASE to the deployed Worker URL, e.g. https://family-storybook-api.<account>.workers.dev
 */
const DEFAULT_PROD_API_BASE = "https://family-storybook-api.inkhel.workers.dev";
const envApiBase = import.meta.env.VITE_API_BASE as string | undefined;
const API_BASE = (envApiBase || (import.meta.env.PROD ? DEFAULT_PROD_API_BASE : "")).replace(/\/+$/, "");

function resolveImageUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

export async function fetchPages(childId: string): Promise<StoryPage[]> {
  const res = await fetch(`${API_BASE}/api/pages?child=${encodeURIComponent(childId)}`);
  if (!res.ok) throw new Error(`Failed to load pages (${res.status})`);
  const pages = (await res.json()) as StoryPage[];
  return pages.map((p) => ({ ...p, image_url: resolveImageUrl(p.image_url) }));
}

export async function fetchChildren(): Promise<ChildSummary[]> {
  const res = await fetch(`${API_BASE}/api/children`);
  if (!res.ok) throw new Error(`Failed to load children (${res.status})`);
  return res.json();
}

export async function addPage(form: FormData): Promise<{ ok: true; page_number: number }> {
  const headers: Record<string, string> = {};
  const token = import.meta.env.VITE_ADMIN_TOKEN as string | undefined;
  if (token) headers["x-admin-token"] = token;

  const res = await fetch(`${API_BASE}/api/pages`, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);
  return res.json();
}
