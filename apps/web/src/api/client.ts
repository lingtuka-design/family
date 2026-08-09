import type { BookCover, ChildSummary, StoryPage } from "../types";
import { auth } from "../lib/firebase";

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

/** Attach the current Firebase ID token so the worker can verify the admin. */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function errorFrom(res: Response): Promise<Error> {
  if (res.status === 401) {
    return new Error("Session expired (401) — please sign in again.");
  }
  if (res.status === 403) {
    return new Error("You are not authorized to do that (403).");
  }
  return new Error((await res.text()) || `Request failed (${res.status})`);
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
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function updatePage(id: number, form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/pages/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function deletePage(id: number): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/pages/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function fetchCovers(): Promise<BookCover[]> {
  const res = await fetch(`${API_BASE}/api/covers`);
  if (!res.ok) throw new Error(`Failed to load covers (${res.status})`);
  const covers = (await res.json()) as BookCover[];
  return covers.map((c) => ({ ...c, image_url: resolveImageUrl(c.image_url) }));
}

export async function addCover(form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/covers`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function updateCover(id: number, form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/covers/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function deleteCover(id: number): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_BASE}/api/covers/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}
