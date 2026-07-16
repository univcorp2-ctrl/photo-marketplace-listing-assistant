import type { Env } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  if (!env.LISTING_IMAGES) return new Response("R2 binding is not configured", { status: 503 });
  const segments = Array.isArray(params.key) ? params.key : [String(params.key || "")];
  const key = segments.join("/");
  const object = await env.LISTING_IMAGES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
};
