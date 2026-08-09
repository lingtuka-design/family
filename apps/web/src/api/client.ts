import type { BookCover, ChildSummary, StoryPage } from "../types";
import { auth } from "../lib/firebase";

/**
 * Base URL of the Cloudflare Worker API.
 * - Local dev: connects DIRECTLY to the live Worker (no Vite proxy,
 *   no local wrangler needed). Override with VITE_API_BASE in apps/web/.env.
 * - Production: same-origin /api, forwarded to the Worker by the Pages
 *   Function at apps/web/functions/api/[[path]].js.
 */
const DEFAULT_LIVE_API_BASE = "https://family-storybook-api.inkhel.workers.dev";
const API_BASE = (
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? DEFAULT_LIVE_API_BASE : "")
).replace(/\/+$/, "");

function resolveImageUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

/**
 * Wraps the NATIVE browser fetch() with a timeout. It never calls itself -
 * if the server stalls (e.g. a connection that hangs on the first request
 * after a page load), the request is aborted after timeoutMs so the app
 * shows a clear error instead of stalling forever.
 */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchWithTimeout(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("The server did not respond - please try again.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
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
  const res = await fetchWithTimeout(`${API_BASE}/api/pages${query}`);
  if (!res.ok) throw new Error(`Failed to load pages (${res.status})`);
  const pages = (await res.json()) as StoryPage[];
  return pages.map((p) => ({ ...p, image_url: resolveImageUrl(p.image_url) }));
}

export async function fetchChildren(): Promise<ChildSummary[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/children`);
  if (!res.ok) throw new Error(`Failed to load children (${res.status})`);
  return res.json();
}

export async function addPage(form: FormData): Promise<{ ok: true; id: number; page_number: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/pages`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function updatePage(id: number, form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/pages/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function deletePage(id: number): Promise<{ ok: true; id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/pages/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function fetchCovers(): Promise<BookCover[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/covers`);
  if (!res.ok) throw new Error(`Failed to load covers (${res.status})`);
  const covers = (await res.json()) as BookCover[];
  return covers.map((c) => ({ ...c, image_url: resolveImageUrl(c.image_url) }));
}

export async function addCover(form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/covers`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function updateCover(id: number, form: FormData): Promise<{ ok: true; id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/covers/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function deleteCover(id: number): Promise<{ ok: true; id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/covers/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}
