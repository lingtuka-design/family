// Cloudflare Pages Function: proxies /api/* to the Cloudflare Worker backend.
// Keeps every request same-origin (https://family-storybook.pages.dev/api/*) -
// no CORS, no *.workers.dev on the user's network.
const WORKER_ORIGIN = "https://family-storybook-api.inkhel.workers.dev";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = `${WORKER_ORIGIN}${url.pathname}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  const res = await fetch(target, {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method)
      ? undefined
      : context.request.body,
    redirect: "manual",
  });

  const outHeaders = new Headers(res.headers);
  outHeaders.set("access-control-allow-origin", "*");

  return new Response(res.body, { status: res.status, headers: outHeaders });
}
