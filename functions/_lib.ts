export interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  MERCARI_SHOPS_TOKEN?: string;
  MERCARI_SHOPS_USER_AGENT?: string;
  MERCARI_SHOPS_API_ENDPOINT?: string;
  MERCARI_API_PROXY_URL?: string;
  PUBLIC_BASE_URL?: string;
  LISTING_IMAGES?: R2Bucket;
}

export const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET, POST, OPTIONS"
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors } });
}

export async function readJson<T>(request: Request): Promise<T> {
  try { return await request.json() as T; } catch { throw new Error("JSONリクエストを読み込めませんでした"); }
}

const listingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "category_hint", "brand", "condition", "defects", "price_min", "price_recommended", "price_max", "keywords", "confidence", "questions", "prohibited_risk"],
  properties: {
    title: { type: "string" }, description: { type: "string" }, category_hint: { type: "string" }, brand: { type: "string" },
    condition: { type: "string", enum: ["BRAND_NEW", "ALMOST_NEW", "CLEAN", "LITTLE_DIRTY", "DIRTY", "BAD"] },
    defects: { type: "array", items: { type: "string" } }, price_min: { type: "integer" }, price_recommended: { type: "integer" }, price_max: { type: "integer" },
    keywords: { type: "array", items: { type: "string" } }, confidence: { type: "number" }, questions: { type: "array", items: { type: "string" } }, prohibited_risk: { type: "string" }
  }
};

export async function analyzePhotos(env: Env, images: string[], notes = "", marketplace = "mercari-personal") {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が未設定です。Cloudflare PagesのSecretsに登録してください");
  if (!images.length || images.length > 4) throw new Error("画像は1〜4枚にしてください");
  const prompt = `日本のフリマ・オークション出品補助です。写真で確認できない事実を断定せず、質問に回してください。真贋、動作、素材、型番、付属品を推測で確定しないでください。出品禁止・規制品の疑いをprohibited_riskに記載してください。出品先=${marketplace}。補足=${notes || "なし"}。自然な日本語タイトルと説明、現実的な価格レンジを作成してください。`;
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }, ...images.map(image_url => ({ type: "input_image", image_url }))];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6",
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "listing_draft", strict: true, schema: listingSchema } }
    })
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(body).slice(0, 500)}`);
  const outputText = extractOutputText(body);
  if (!outputText) throw new Error("OpenAI APIから構造化出力を取得できませんでした");
  return JSON.parse(outputText);
}

function extractOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    }
  }
  return "";
}

export async function mercariGraphql(env: Env, query: string, variables: Record<string, unknown> = {}) {
  if (!env.MERCARI_SHOPS_TOKEN) throw new Error("MERCARI_SHOPS_TOKEN が未設定です");
  if (!env.MERCARI_SHOPS_USER_AGENT) throw new Error("MERCARI_SHOPS_USER_AGENT が未設定です（契約時に指定されたクライアント名/バージョン）");
  const endpoint = env.MERCARI_API_PROXY_URL || env.MERCARI_SHOPS_API_ENDPOINT || "https://api.mercari-shops.com/v1/graphql";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${env.MERCARI_SHOPS_TOKEN}`, "user-agent": env.MERCARI_SHOPS_USER_AGENT, "content-type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  const body = await response.json() as { data?: unknown; errors?: Array<{ message?: string }> };
  if (!response.ok || body.errors?.length) throw new Error(body.errors?.map(error => error.message).join(" / ") || `Mercari Shops API error (${response.status})`);
  return body.data;
}
