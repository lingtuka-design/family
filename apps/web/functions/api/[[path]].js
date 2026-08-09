// Cloudflare Pages Function: proxies same-origin /api/* requests to the
// live Cloudflare Worker backend. Production never calls *.workers.dev
// from the browser - it goes pages.dev -> this function -> worker.
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
