import { json, readJson, type Env } from "../_lib";

interface ImagesBody { images: string[] }

export const onRequestOptions: PagesFunction = async () => json({ ok: true });
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.LISTING_IMAGES) throw new Error("R2 binding LISTING_IMAGES が未設定です。docs/setup.mdの手順で画像バケットを接続してください");
    const { images } = await readJson<ImagesBody>(request);
    if (!Array.isArray(images) || !images.length || images.length > 20) throw new Error("画像は1〜20枚です");
    const baseUrl = env.PUBLIC_BASE_URL || new URL(request.url).origin;
    const urls: string[] = [];
    for (const dataUrl of images) {
      const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
      if (!match) throw new Error("対応画像形式は JPEG / PNG / WebP / GIF です");
      const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
      if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("1画像は10MB以内です");
      const ext = match[1].split("/")[1].replace("jpeg", "jpg");
      const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      await env.LISTING_IMAGES.put(key, bytes, { httpMetadata: { contentType: match[1], cacheControl: "public, max-age=31536000, immutable" } });
      urls.push(`${baseUrl}/images/${key}`);
    }
    return json({ ok: true, urls });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "画像保存に失敗しました" }, 400);
  }
};
