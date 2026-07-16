import readline from "node:readline";

interface RpcRequest { jsonrpc: "2.0"; id?: string | number; method: string; params?: Record<string, unknown> }
const protocolVersion = "2025-06-18";

function send(message: unknown) { process.stdout.write(`${JSON.stringify(message)}\n`); }
function result(id: RpcRequest["id"], value: unknown) { send({ jsonrpc: "2.0", id, result: value }); }
function failure(id: RpcRequest["id"], code: number, message: string) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

const tools = [
  { name: "analyze_listing_photos", description: "1〜4枚の商品写真から日本語の出品原稿を生成します", inputSchema: { type: "object", properties: { images: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }, notes: { type: "string" }, marketplace: { type: "string", enum: ["mercari-personal", "yahoo-auctions", "mercari-shops"] } }, required: ["images"] } },
  { name: "publish_mercari_shops", description: "メルカリShops公式GraphQL APIで商品を作成します", inputSchema: { type: "object", properties: { input: { type: "object" } }, required: ["input"] } },
  { name: "export_marketplace_draft", description: "個人版メルカリ/Yahoo!オークション向けの確認用原稿を整形します", inputSchema: { type: "object", properties: { marketplace: { type: "string" }, title: { type: "string" }, description: { type: "string" }, price: { type: "number" } }, required: ["marketplace", "title", "description", "price"] } }
];

async function callOpenAI(args: Record<string, unknown>) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const images = Array.isArray(args.images) ? args.images : [];
  const prompt = `日本の出品補助。確認できない事実を断定しない。出品先=${String(args.marketplace || "mercari-personal")}。補足=${String(args.notes || "なし")}。JSONで title, description, category_hint, brand, condition, defects, price_min, price_recommended, price_max, keywords, confidence, questions, prohibited_risk を返す。`;
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", input: [{ role: "user", content: [{ type: "input_text", text: prompt }, ...images.map(image_url => ({ type: "input_image", image_url }))] }] }) });
  const body = await response.json() as { output_text?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || `OpenAI error ${response.status}`);
  return body.output_text || JSON.stringify(body);
}

async function callMercari(args: Record<string, unknown>) {
  const token = process.env.MERCARI_SHOPS_TOKEN;
  const userAgent = process.env.MERCARI_SHOPS_USER_AGENT;
  if (!token || !userAgent) throw new Error("MERCARI_SHOPS_TOKEN / MERCARI_SHOPS_USER_AGENT are required");
  const query = `mutation createProduct($input: CreateProductInput!) { createProduct(input: $input) { product { id name status price imageUrls } } }`;
  const response = await fetch(process.env.MERCARI_SHOPS_API_ENDPOINT || "https://api.mercari-shops.com/v1/graphql", { method: "POST", headers: { authorization: `Bearer ${token}`, "user-agent": userAgent, "content-type": "application/json" }, body: JSON.stringify({ query, variables: { input: args.input } }) });
  const body = await response.json();
  if (!response.ok) throw new Error(`Mercari Shops API error ${response.status}`);
  return JSON.stringify(body);
}

async function handle(request: RpcRequest) {
  if (request.method === "initialize") return result(request.id, { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "photo-marketplace-listing-assistant", version: "1.0.0" } });
  if (request.method === "notifications/initialized") return;
  if (request.method === "ping") return result(request.id, {});
  if (request.method === "tools/list") return result(request.id, { tools });
  if (request.method === "tools/call") {
    const name = String(request.params?.name || "");
    const args = (request.params?.arguments || {}) as Record<string, unknown>;
    try {
      let text: string;
      if (name === "analyze_listing_photos") text = await callOpenAI(args);
      else if (name === "publish_mercari_shops") text = await callMercari(args);
      else if (name === "export_marketplace_draft") text = `【${String(args.marketplace)}】\n${String(args.title)}\n\n${String(args.description)}\n\n価格: ${Number(args.price).toLocaleString()}円`;
      else throw new Error(`Unknown tool: ${name}`);
      return result(request.id, { content: [{ type: "text", text }] });
    } catch (error) { return result(request.id, { content: [{ type: "text", text: error instanceof Error ? error.message : "tool error" }], isError: true }); }
  }
  if (request.id !== undefined) failure(request.id, -32601, `Method not found: ${request.method}`);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", line => { try { void handle(JSON.parse(line) as RpcRequest); } catch { failure(undefined, -32700, "Parse error"); } });
