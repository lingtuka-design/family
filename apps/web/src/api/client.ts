import type { ChildSummary, StoryPage } from "../types";

/**
 * Base URL of the Cloudflare Worker API.
 * - Dev: unset -> /api is proxied by Vite to wrangler dev on :8787.
 * - Prod: set in apps/web/.env.production (VITE_API_BASE).
 */
const DEFAULT_PROD_API_BASE = "https://family-storybook-api.inkhel.workers.dev";
const API_BASE = (
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  (import.meta.env.PROD ? DEFAULT_PROD_API_BASE : "")
).replace(/\/+$/, "");

function resolveImageUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

function authHeaders(): Record<string, string> {
  const token = import.meta.env.VITE_ADMIN_TOKEN as string | undefined;
  return token ? { "x-admin-token": token } : {};
}

/** Pages of one child (or ALL pages when childId is omitted - admin panel). */
export async function fetchPages(childId?: string): Promise<StoryPage[]> {
  const query = childId ? `?child=${encodeURIComponent(childId)}` : "";
  const res = await fetch(`${API_BASE}/api/pages${query}`);
  if (!res.ok) throw new Error(`Failed to load pages (${res.status})`);
  const pages = (await res.json()) as StoryPage[];
  return pages.map((p) => ({ ...p, image_url: resolveImageUrl(p.image_url) }));
}

export async function fetchChildren(): Promise<ChildSummary[]> {
  const res = await fetch(`${API_BASE}/api/children`);
  if (!res.ok) throw new Error(`Failed to load children (${res.status})`);
  return res.json();
}

export async function addPage(form: FormData): Promise<{ ok: true; id: number; page_number: number }> {
  const res = await fetch(`${API_BASE}/api/pages`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);
  return res.json();
}

export async function updatePage(id: number, form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/pages/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.text()) || `Update failed (${res.status})`);
  return res.json();
}

export async function deletePage(id: number): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/pages/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.text()) || `Delete failed (${res.status})`);
  return res.json();
}
