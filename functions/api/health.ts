import { json, type Env } from "../_lib";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => json({
  ok: true,
  service: "photo-marketplace-listing-assistant",
  configured: {
    openai: Boolean(env.OPENAI_API_KEY),
    mercariShops: Boolean(env.MERCARI_SHOPS_TOKEN && env.MERCARI_SHOPS_USER_AGENT),
    imageStorage: Boolean(env.LISTING_IMAGES)
  }
});
