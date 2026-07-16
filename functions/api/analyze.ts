import { analyzePhotos, json, readJson, type Env } from "../_lib";

interface AnalyzeBody { images: string[]; notes?: string; marketplace?: string }

export const onRequestOptions: PagesFunction = async () => json({ ok: true });
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<AnalyzeBody>(request);
    const draft = await analyzePhotos(env, body.images || [], body.notes || "", body.marketplace || "mercari-personal");
    return json({ ok: true, draft });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "解析に失敗しました" }, 400);
  }
};
