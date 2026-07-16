import { json, mercariGraphql, readJson, type Env } from "../../_lib";

interface PublishBody {
  name: string; description: string; price: number; categoryId: string; condition: string; imageUrls: string[];
  shippingDuration: string; shippingFromStateId: string; shippingMethod: string; shippingPayer: string; status: string;
  variants: Array<{ name?: string; skuCode?: string; stockQuantity: number }>;
}

const mutation = `mutation createProduct($input: CreateProductInput!) { createProduct(input: $input) { product { id name status price imageUrls } } }`;

export const onRequestOptions: PagesFunction = async () => json({ ok: true });
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const input = await readJson<PublishBody>(request);
    if (!input.name || input.name.length > 130) throw new Error("商品名は1〜130文字です");
    if (!input.description || input.description.length > 3000) throw new Error("説明文は1〜3000文字です");
    if (!Number.isInteger(input.price) || input.price < 300 || input.price > 9_999_999) throw new Error("価格は300〜9,999,999円です");
    if (!input.categoryId || !input.shippingFromStateId) throw new Error("カテゴリIDと発送元都道府県IDが必要です");
    if (!Array.isArray(input.imageUrls) || !input.imageUrls.length || input.imageUrls.some(url => !url.startsWith("https://"))) throw new Error("HTTPS画像URLが1枚以上必要です");
    const data = await mercariGraphql(env, mutation, { input });
    const product = (data as { createProduct?: { product?: unknown } })?.createProduct?.product;
    if (!product) throw new Error("商品作成結果を取得できませんでした");
    return json({ ok: true, product });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "出品に失敗しました" }, 400);
  }
};
