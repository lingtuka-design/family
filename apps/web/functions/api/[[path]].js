/**
 * Cloudflare Pages Function proxy: forwards any request to /api/*
 * directly to the deployed Cloudflare Worker API.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = new URL(
    url.pathname + url.search,
    "https://family-storybook-api.inkhel.workers.dev"
  );

  return fetch(new Request(targetUrl, context.request));
}
